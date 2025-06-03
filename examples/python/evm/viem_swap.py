#!/usr/bin/env python3
# Usage: uv run python evm/viem_swap.py

"""
Example: Swap via Viem/Web3

This example demonstrates how to create a swap quote and prepare
the transaction data for execution through viem (or any other
web3 library). This is useful when you want to execute swaps
through your own infrastructure or frontend applications.
"""

import asyncio
import json
from decimal import Decimal

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Create a swap quote and prepare for viem execution."""
    async with CdpClient() as cdp:
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        # Your wallet address (this would be the address executing the swap)
        wallet_address = "0x1234567890123456789012345678901234567890"  # Replace with your address
        
        print("Creating swap quote for external execution...")
        print(f"Wallet address: {wallet_address}")
        print(f"Swap: 10 USDC → WETH on Base\n")
        
        try:
            # Create a swap quote
            quote = await cdp.evm.create_swap_quote(
                from_token=USDC,
                to_token=WETH,
                from_amount="10000000",  # 10 USDC (6 decimals)
                network="base",
                taker=wallet_address,
                slippage_bps=100,  # 1% slippage
                # Note: Don't pass from_account since we'll execute externally
            )
            
            # Display quote details
            print("📊 Swap Quote Details:")
            print(f"   Quote ID: {quote.quote_id}")
            print(f"   Selling: {Decimal(quote.from_amount) / Decimal(10**6):.2f} USDC")
            print(f"   Expected output: {Decimal(quote.to_amount) / Decimal(10**18):.6f} WETH")
            print(f"   Minimum output: {Decimal(quote.min_to_amount) / Decimal(10**18):.6f} WETH")
            
            # Prepare transaction data for viem
            print("\n📋 Transaction Data for Viem:")
            
            # Basic transaction data
            viem_tx = {
                "to": quote.to,
                "data": quote.data,
                "value": quote.value,  # Value in wei as string
                "from": wallet_address,
            }
            
            # Add gas parameters if available
            if quote.gas_limit:
                viem_tx["gas"] = str(quote.gas_limit)
            if quote.max_fee_per_gas:
                viem_tx["maxFeePerGas"] = quote.max_fee_per_gas
            if quote.max_priority_fee_per_gas:
                viem_tx["maxPriorityFeePerGas"] = quote.max_priority_fee_per_gas
            
            print(json.dumps(viem_tx, indent=2))
            
            # Show TypeScript/JavaScript code for viem
            print("\n📝 Example Viem Code:")
            print("""
// Using viem to execute the swap
import { createWalletClient, http, parseEther } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...')  // Your private key
const client = createWalletClient({
  account,
  chain: base,
  transport: http()
})

// Execute the swap transaction
const hash = await client.sendTransaction({""")
            
            print(f'  to: "{viem_tx["to"]}",')
            print(f'  data: "{viem_tx["data"]}",')
            print(f'  value: {viem_tx["value"]},  // {int(viem_tx["value"]) / 1e18:.6f} ETH')
            
            if "gas" in viem_tx:
                print(f'  gas: {viem_tx["gas"]}n,')
            if "maxFeePerGas" in viem_tx:
                print(f'  maxFeePerGas: {viem_tx["maxFeePerGas"]}n,')
            if "maxPriorityFeePerGas" in viem_tx:
                print(f'  maxPriorityFeePerGas: {viem_tx["maxPriorityFeePerGas"]}n,')
                
            print("""})

console.log('Transaction hash:', hash)""")
            
            # Handle Permit2 signature if required
            if quote.requires_signature and quote.permit2_data:
                print("\n⚠️  Note: This swap requires a Permit2 signature!")
                print("   You'll need to sign the following EIP-712 data before sending the transaction:")
                print("\n   Permit2 EIP-712 Data:")
                print(json.dumps(quote.permit2_data.eip712, indent=2))
                print(f"\n   Expected signature hash: {quote.permit2_data.hash}")
                print("\n   Add the signature to the transaction data before sending.")
            
        except Exception as e:
            print(f"\n❌ Error creating quote: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 