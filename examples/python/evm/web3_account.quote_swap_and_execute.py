#!/usr/bin/env python3
# Usage: uv run python evm/web3_account.quote_swap_and_execute.py

"""
Example: Create and Execute a Swap via web3.py

This example demonstrates how to create a swap quote using the CDP SDK
and execute it using web3.py. This is useful when you want to execute
swaps through your own infrastructure or when you need more control
over the transaction execution process.

Note: This example requires you to have a funded wallet with private key.
Never share or commit your private key!
"""

import asyncio
import os
from decimal import Decimal

from cdp import CdpClient
from dotenv import load_dotenv
from eth_account.messages import encode_structured_data
from web3 import Web3

load_dotenv()


async def main():
    """Create a swap quote and execute it using web3.py."""
    async with CdpClient() as cdp:
        # Connect to Base mainnet
        w3 = Web3(Web3.HTTPProvider('https://mainnet.base.org'))
        
        # IMPORTANT: In production, use environment variables or secure key management
        # Example: private_key = os.getenv("PRIVATE_KEY")
        private_key = "0x..."  # Replace with your private key (keep it secret!)
        
        if private_key == "0x...":
            print("❌ Please replace the private key placeholder with your actual private key")
            print("   Never commit your private key to version control!")
            return
        
        # Get account from private key
        account = w3.eth.account.from_key(private_key)
        wallet_address = account.address
        
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        print("Creating swap quote for web3.py execution...")
        print(f"Wallet address: {wallet_address}")
        print(f"Swap: 10 USDC → WETH on Base")
        
        # Check wallet balance
        balance = w3.eth.get_balance(wallet_address)
        print(f"ETH balance: {w3.from_wei(balance, 'ether')} ETH\n")
        
        try:
            # Create a swap quote
            quote = await cdp.evm.create_swap_quote(
                from_token=USDC,
                to_token=WETH,
                from_amount="10000000",  # 10 USDC (6 decimals)
                network="base",
                taker=wallet_address,
                slippage_bps=100,  # 1% slippage
            )
            
            # Check if liquidity is available
            if not quote.liquidity_available:
                print("\n❌ Swap unavailable: Insufficient liquidity")
                print("   Try a smaller amount or a different token pair")
                return
            
            # Display quote details
            print("📊 Swap Quote Details:")
            print(f"   Quote ID: {quote.quote_id}")
            print(f"   Selling: {Decimal(quote.from_amount) / Decimal(10**6):.2f} USDC")
            print(f"   Expected output: {Decimal(quote.to_amount) / Decimal(10**18):.6f} WETH")
            print(f"   Minimum output: {Decimal(quote.min_to_amount) / Decimal(10**18):.6f} WETH")
            
            # Prepare transaction
            print("\n📋 Preparing transaction...")
            
            # Build the transaction
            transaction = {
                'from': wallet_address,
                'to': Web3.to_checksum_address(quote.to),
                'data': quote.data,
                'value': int(quote.value),
                'gas': quote.gas_limit if quote.gas_limit else 200000,
                'nonce': w3.eth.get_transaction_count(wallet_address),
            }
            
            # Add gas price parameters
            if quote.max_fee_per_gas and quote.max_priority_fee_per_gas:
                # EIP-1559 transaction
                transaction['maxFeePerGas'] = int(quote.max_fee_per_gas)
                transaction['maxPriorityFeePerGas'] = int(quote.max_priority_fee_per_gas)
            else:
                # Legacy transaction - get current gas price
                transaction['gasPrice'] = w3.eth.gas_price
            
            # Handle Permit2 signature if required
            if quote.requires_signature and quote.permit2_data:
                print("\n⚠️  This swap requires a Permit2 signature!")
                print("   Signing EIP-712 data...")
                
                # Get the EIP-712 data from the quote
                eip712_data = quote.permit2_data.eip712
                
                # Encode the structured data for signing
                structured_data = encode_structured_data(eip712_data)
                
                # Sign the EIP-712 message
                signature = account.sign_message(structured_data)
                
                # Extract the signature components
                sig_hex = signature.signature.hex()
                # Remove 0x prefix if present
                if sig_hex.startswith('0x'):
                    sig_hex = sig_hex[2:]
                
                # Calculate signature length in bytes
                sig_length = len(sig_hex) // 2  # Convert hex chars to bytes
                
                # Convert length to 32-byte hex value (64 hex chars)
                sig_length_hex = f"{sig_length:064x}"  # 32 bytes = 64 hex chars
                
                # Append signature data to the transaction data
                # Format: original data + signature length (32 bytes) + signature
                transaction['data'] = quote.data + sig_length_hex + sig_hex
                
                print(f"   ✅ Permit2 signature added ({sig_length} bytes)")
                print(f"   Signature hash: {quote.permit2_data.hash}")
            
            # Estimate gas if not provided
            if not quote.gas_limit:
                print("\n⛽ Estimating gas...")
                gas_estimate = w3.eth.estimate_gas(transaction)
                transaction['gas'] = int(gas_estimate * 1.2)  # Add 20% buffer
                print(f"   Estimated gas: {gas_estimate}, using: {transaction['gas']}")
            
            # Sign the transaction
            print("\n✍️  Signing transaction...")
            signed_txn = account.sign_transaction(transaction)
            
            # Send the transaction
            print("\n📤 Sending transaction...")
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            print(f"   Transaction hash: {tx_hash.hex()}")
            print(f"   Explorer: https://basescan.org/tx/{tx_hash.hex()}")
            
            # Wait for confirmation
            print("\n⏳ Waiting for confirmation...")
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] == 1:
                print("\n✅ Swap successful!")
                print(f"   Gas used: {receipt['gasUsed']:,}")
                print(f"   Block: {receipt['blockNumber']:,}")
            else:
                print("\n❌ Swap failed!")
                print("   Check the transaction on Basescan for details")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 