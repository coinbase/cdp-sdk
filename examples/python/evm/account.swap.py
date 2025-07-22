#!/usr/bin/env python3
# Usage: uv run python evm/account_swap.py

"""
Example: Account Swap - All-in-One Pattern

This example demonstrates the recommended approach for performing token swaps
using the CDP SDK's all-in-one swap pattern.

Why use account.swap() (all-in-one pattern)?
- Simplest developer experience - one function call
- Automatically handles quote creation and execution
- Manages Permit2 signatures transparently
- Built-in error handling for common issues
- Best for 90% of swap use cases

This example shows two approaches:

Approach 1: All-in-one pattern (RECOMMENDED)
- Uses account.swap() with inline options
- Creates and executes swaps in a single call
- Automatically validates liquidity and throws clear errors
- Minimal code, maximum convenience

Approach 2: Create-then-execute pattern (advanced)
- First creates a swap quote using account.quote_swap()
- Allows inspection of swap details before execution
- Provides more control for complex scenarios
- Use when you need conditional logic based on swap details

Common features:
- Both handle Permit2 signatures automatically for ERC20 swaps
- Both check for and report liquidity issues
- Both require proper token allowances (see handle_token_allowance)

Choose based on your needs:
- Use Approach 1 for simple, direct swaps (recommended)
- Use Approach 2 when you need to inspect details or add custom logic
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from cdp.actions.evm.swap import AccountSwapOptions

from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.utils import parse_units
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

# Network configuration
NETWORK = "base"  # Base mainnet

# Token definitions for the example (using Base mainnet token addresses)
TOKENS = {
    "WETH": {
        "address": "0x4200000000000000000000000000000000000006",
        "symbol": "WETH",
        "decimals": 18,
        "is_native_asset": False
    },
    "USDC": {
        "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "symbol": "USDC",
        "decimals": 6,
        "is_native_asset": False
    },
}

# Permit2 contract address is the same across all networks
PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

# Web3 instance for transaction receipt checking (Base mainnet RPC)
w3_rpc = Web3(Web3.HTTPProvider('https://mainnet.base.org'))

# ERC20 ABI for allowance and approve functions
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
]


async def main():
    """Execute a direct swap using SwapOptions."""
    print(f"Note: This example is using {NETWORK} network. Make sure you have funds available.")
    
    async with CdpClient() as cdp:
        # Get or create an account to use for the swap
        account = await cdp.evm.get_or_create_account(name="SwapAccountWithOptions")
        print(f"\nUsing account: {account.address}")
        
        try:
            # Define the tokens we're working with
            from_token = TOKENS["WETH"]
            to_token = TOKENS["USDC"]
            
            # Set the amount we want to send
            from_amount = parse_units("0.1", from_token["decimals"])  # 0.1 WETH
            
            # Use Web3 for cleaner amount formatting
            from_amount_decimal = Web3.from_wei(int(from_amount), 'ether') if from_token["decimals"] == 18 else Decimal(from_amount) / Decimal(10 ** from_token["decimals"])
            print(f"\nInitiating swap of {from_amount_decimal:.6f} {from_token['symbol']} for {to_token['symbol']}")
            
            # Handle token allowance check and approval if needed (applicable when sending non-native assets only)
            if not from_token["is_native_asset"]:
                await handle_token_allowance(
                    account,
                    from_token["address"],
                    from_token["symbol"],
                    from_amount,
                    from_token["decimals"]
                )
            
            # Create and submit the swap transaction
            print("\nCreating and submitting swap in one call...")
            
            try:
                # Approach 1: All-in-one pattern
                # Create and execute the swap in one call - simpler but less control
                result = await account.swap(
                    AccountSwapOptions(
                        network=NETWORK,
                        from_token=from_token["address"],
                        to_token=to_token["address"],
                        from_amount=from_amount,
                        slippage_bps=100,  # 1% slippage tolerance
                    )
                )
                
                """
                Alternative - Approach 2: Create swap quote first, inspect it, then send it separately
                This gives you more control to analyze the swap details before execution
                
                # Step 1: Create the swap quote
                swap_quote = await account.quote_swap(
                    from_token=from_token["address"],
                    to_token=to_token["address"],
                    from_amount=from_amount,
                    network=NETWORK,
                    slippage_bps=100,  # 1% slippage tolerance
                )
                
                # Step 2: Check if liquidity is available
                if not swap_quote.liquidity_available:
                    print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
                    return
                
                # Step 3: Optionally inspect swap details
                to_amount_decimal = Decimal(swap_quote.to_amount) / Decimal(10 ** to_token["decimals"])
                min_to_amount_decimal = Decimal(swap_quote.min_to_amount) / Decimal(10 ** to_token["decimals"])
                print(f"Receive Amount: {to_amount_decimal:.2f} {to_token['symbol']}")
                print(f"Min Receive Amount: {min_to_amount_decimal:.2f} {to_token['symbol']}")
                
                # Step 4: Send the swap transaction
                # Option A: Using account.swap() with the pre-created swap quote
                result = await account.swap(AccountSwapOptions(swap_quote=swap_quote))
                
                # Option B: Using the swap quote's execute() method directly
                # result = await swap_quote.execute()
                """
                
                print(f"\n✅ Swap submitted successfully!")
                print(f"Transaction hash: {result.transaction_hash}")
                print(f"🔗 View on explorer: https://basescan.org/tx/{result.transaction_hash}")
                print(f"⏳ Waiting for transaction confirmation...")
                
                # Wait for transaction confirmation using Web3.py
                try:
                    # Use global Web3 instance for transaction receipt
                    tx_receipt = w3_rpc.eth.wait_for_transaction_receipt(result.transaction_hash)
                    
                    print(f"\n✅ Swap transaction confirmed in block {tx_receipt.blockNumber}!")
                    print(f"📊 Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")
                    print(f"⛽ Gas used: {tx_receipt.gasUsed:,}")
                    
                except Exception as receipt_error:
                    print(f"\n⚠️ Could not wait for transaction receipt: {receipt_error}")
                    print("Transaction was submitted but confirmation status unknown.")
                    print("Check the explorer link above to verify transaction status.")
                
            except Exception as error:
                # The all-in-one pattern will throw an error if liquidity is not available
                if "Insufficient liquidity" in str(error):
                    print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
                    print("Try reducing the swap amount or using a different token pair.")
                else:
                    raise error
                    
        except Exception as error:
            print(f"Error executing swap: {error}")


async def get_allowance(account, token_address: str, spender_address: str, token_symbol: str) -> int:
    """Check token allowance for the Permit2 contract.
    
    Args:
        account: The account that owns the tokens
        token_address: The token contract address  
        spender_address: The address allowed to spend the tokens (Permit2)
        token_symbol: The token symbol for logging
        
    Returns:
        int: The current allowance amount in smallest units
    """
    print(f"\nChecking allowance for {token_symbol} ({token_address}) to Permit2 contract...")
    
    try:
        # Use Web3.py directly to check allowance (read-only call)
        contract = w3_rpc.eth.contract(address=token_address, abi=ERC20_ABI)
        
        print(f"🌐 Making read-only contract call via Web3.py...")
        
        try:
            # Make direct contract call using Web3.py
            current_allowance = contract.functions.allowance(
                Web3.to_checksum_address(account.address),
                Web3.to_checksum_address(spender_address)
            ).call()
            
            return current_allowance
                
        except Exception as call_error:
            print(f"❌ Web3 contract call failed: {call_error}")
            print("🔄 For demo purposes, returning 0 to trigger approval flow...")
            return 0
        
    except Exception as error:
        print(f"Error checking allowance: {error}")
        return 0


async def approve_token_allowance(account, token_address: str, spender_address: str, amount: str, token_symbol: str):
    """Handle approval for token allowance using Web3.py and CDP SDK.
    
    This is necessary when swapping ERC20 tokens (not native ETH).
    The Permit2 contract needs approval to move tokens on your behalf.
    
    Args:
        account: The account that owns the tokens
        token_address: The token contract address
        spender_address: The address allowed to spend the tokens (Permit2)
        amount: The amount to approve (in smallest units)
        token_symbol: The symbol of the token (e.g., WETH, USDC)
    """
    print(f"\nApproving token allowance for {token_address} to spender {spender_address}")
    
    try:
        # Use global Web3 instance with Base mainnet provider
        contract = w3_rpc.eth.contract(address=token_address, abi=ERC20_ABI)
        
        # Encode the approve function call using Web3
        call_data = contract.functions.approve(
            Web3.to_checksum_address(spender_address),
            int(amount)
        ).build_transaction({'gas': 0})['data']
        
        print(f"Sending approval transaction for {token_symbol}...")
        
        try:
            # Use CDP SDK to send the approval transaction
            result = await account.send_transaction(
                transaction=TransactionRequestEIP1559(
                    to=token_address,
                    data=call_data,
                    value=0,  # No ETH value for approve
                ),
                network=NETWORK
            )
            
            print(f"✅ Approval transaction submitted!")
            print(f"Transaction hash: {result}")
            print(f"🔗 View on explorer: https://basescan.org/tx/{result}")
            print(f"⏳ Waiting for transaction confirmation...")
            
            # Wait for transaction confirmation using Web3.py
            try:
                # Use global Web3 instance for transaction receipt
                tx_receipt = w3_rpc.eth.wait_for_transaction_receipt(result)
                
                print(f"✅ Approval transaction confirmed in block {tx_receipt.blockNumber}!")
                print(f"📊 Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")
                print(f"⛽ Gas used: {tx_receipt.gasUsed:,}")
                print(f"🎉 {token_symbol} can now be spent by Permit2")
                return result
                
            except Exception as receipt_error:
                print(f"⚠️ Could not wait for transaction receipt: {receipt_error}")
                print("Transaction was submitted but confirmation status unknown.")
                print("Check the explorer link above to verify transaction status.")
                return result
            
        except Exception as tx_error:
            print(f"❌ Transaction submission failed: {tx_error}")
            print("This might be because:")
            print("- Insufficient funds for gas")
            print("- Network connectivity issues") 
            print("- Invalid transaction data")
            raise tx_error
        
    except Exception as error:
        print(f"Error approving allowance: {error}")
        raise error


async def handle_token_allowance(account, token_address: str, token_symbol: str, from_amount: str, token_decimals: int = 18):
    """Handle token allowance check and approval if needed.
    
    This is necessary when swapping ERC20 tokens (not native ETH).
    The Permit2 contract needs approval to move tokens on your behalf.
    
    Args:
        account: The account that owns the tokens
        token_address: The address of the token to be sent
        token_symbol: The symbol of the token (e.g., WETH, USDC)
        from_amount: The amount to be sent (as string)
        token_decimals: The number of decimals for the token (default 18)
    """
    print(f"\n🔐 Checking token allowance for {token_symbol}...")
    
    # Check current allowance
    current_allowance = await get_allowance(
        account, 
        token_address,
        PERMIT2_ADDRESS,
        token_symbol
    )
    
    # Check if allowance is sufficient
    required_amount = int(from_amount)
    if current_allowance < required_amount:
        # Use Web3 for cleaner formatting if 18 decimals
        if token_decimals == 18:
            allowance_formatted = Web3.from_wei(current_allowance, 'ether')
            required_formatted = Web3.from_wei(required_amount, 'ether')
        else:
            allowance_formatted = Decimal(current_allowance) / Decimal(10**token_decimals)
            required_formatted = Decimal(required_amount) / Decimal(10**token_decimals)
            
        print(f"❌ Allowance insufficient. Current: {allowance_formatted:.6f}, Required: {required_formatted:.6f}")
        
        # Approve the required amount
        await approve_token_allowance(
            account,
            token_address, 
            PERMIT2_ADDRESS,
            from_amount,
            token_symbol
        )
        
        print(f"✅ Set allowance to {required_formatted:.6f} {token_symbol}")
    else:
        # Use Web3 for cleaner formatting if 18 decimals
        if token_decimals == 18:
            allowance_formatted = Web3.from_wei(current_allowance, 'ether')
            required_formatted = Web3.from_wei(required_amount, 'ether')
        else:
            allowance_formatted = Decimal(current_allowance) / Decimal(10**token_decimals)
            required_formatted = Decimal(required_amount) / Decimal(10**token_decimals)
            
        print(f"✅ Token allowance sufficient. Current: {allowance_formatted:.6f} {token_symbol}, Required: {required_formatted:.6f} {token_symbol}")


if __name__ == "__main__":
    asyncio.run(main()) 