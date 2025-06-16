#!/usr/bin/env python3
# Usage: uv run python evm/smart_account.quote_swap.py

"""
Example: Smart Account Quote Swap

This example demonstrates how to create a swap quote using the smart_account.quote_swap() method.
This is a convenience method that automatically includes the smart account's address as the taker.

Key differences from cdp.evm.create_swap_quote():
- smart_account.quote_swap(): Automatically uses the smart account address as taker
- smart_account.quote_swap(): More convenient API for smart account-based swaps
- cdp.evm.create_swap_quote(): Requires explicitly specifying the taker address
- cdp.evm.create_swap_quote(): More flexible for advanced use cases

IMPORTANT: Like create_swap_quote, this signals a soft commitment to swap and may reserve
funds on-chain. As such, it is rate-limited more strictly than get_swap_price
to prevent abuse. Use get_swap_price for more frequent price checks.

Use smart_account.quote_swap() when you need:
- Complete user operation data ready for execution
- Precise swap parameters with high accuracy
- To inspect swap details before execution
- Simplified API for smart account-based swaps

The quote includes:
- User operation data (calls, signatures)
- Permit2 signature requirements for ERC20 swaps
- Exact amounts with slippage protection
- Gas estimates and potential issues

Note: For the simplest swap experience, use smart_account.swap() which handles
quote creation and execution in one call. Use smart_account.quote_swap() when you
need more control over the process.

Smart account swaps work differently from regular account swaps:
- Smart account address is used as the taker (it owns the tokens)
- Owner signs permit2 messages (not the smart account itself)
- Uses send_swap_operation → send_user_operation instead of send_swap_transaction
- Returns user operation hash instead of transaction hash
- Supports paymaster for gas sponsorship
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from cdp.actions.evm.swap import SmartAccountSwapOptions

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

# Web3 instance for transaction monitoring (Base mainnet RPC)
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
    """Create a swap quote using smart account convenience method."""
    print(f"Note: This example is using {NETWORK} network with smart accounts.")
    
    async with CdpClient() as cdp:
        # Create an owner account for the smart account
        owner_account = await cdp.evm.get_or_create_account(name="SmartAccountOwner")
        print(f"Owner account: {owner_account.address}")

        # Get or create a smart account to use for the swap
        smart_account = await cdp.evm.get_or_create_smart_account(owner=owner_account, name="SmartAccount")
        print(f"\nUsing smart account: {smart_account.address}")
        
        try:
            # Define the tokens we're working with
            from_token = TOKENS["WETH"]
            to_token = TOKENS["USDC"]
            
            # Set the amount we want to send
            from_amount = parse_units("0.1", from_token["decimals"])  # 0.1 WETH
            
            from_amount_decimal = Decimal(from_amount) / Decimal(10 ** from_token["decimals"])
            print(f"\nCreating a swap quote for {from_amount_decimal:.6f} {from_token['symbol']} to {to_token['symbol']}")
            
            # Create the swap quote using the smart account's quote_swap method
            print("\nFetching swap quote using smart_account.quote_swap()...")
            swap_quote = await smart_account.quote_swap(
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=from_amount,
                network=NETWORK,
                slippage_bps=100,  # 1% slippage tolerance
                # Optional: paymaster_url="https://paymaster.example.com"  # For gas sponsorship
            )
            
            # Check if liquidity is available
            if not swap_quote.liquidity_available:
                print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
                print("Try reducing the swap amount or using a different token pair.")
                return
            
            # Log swap details
            log_swap_info(swap_quote, from_token, to_token)
            
            # Validate the swap for any issues
            validate_swap(swap_quote)
            
            print("\nSwap quote created successfully. To execute this swap, you would need to:")
            print("1. Ensure your smart account has sufficient token allowance for Permit2 contract")
            print("2. Submit the swap via user operation using smart_account.swap({ swap_quote })")
            print("3. Wait for user operation confirmation")
            
            # Show how to execute the swap using the smart_account.swap() method
            print("\nTo execute this swap, you can use:")
            print("```python")
            print("# Execute the swap using the quote")
            print("result = await smart_account.swap(")
            print("    SmartAccountSwapOptions(swap_quote=swap_quote)")
            print(")")
            print("# User operation hash: result.user_op_hash")
            print("")
            print("# Or execute using the quote's execute() method")
            print("execute_result = await swap_quote.execute()")
            print("# User operation hash: execute_result.user_op_hash")
            print("```")
            
        except Exception as error:
            print(f"Error creating swap quote: {error}")


def log_swap_info(swap_quote, from_token: dict, to_token: dict):
    """Log information about the swap.
    
    Args:
        swap_quote: The swap transaction data
        from_token: The token being sent
        to_token: The token being received
    """
    print("\nSwap Quote Details:")
    print("-------------------")
    
    # Convert amounts to readable format
    from_amount_decimal = Decimal(swap_quote.from_amount) / Decimal(10 ** from_token["decimals"])
    to_amount_decimal = Decimal(swap_quote.to_amount) / Decimal(10 ** to_token["decimals"])
    min_to_amount_decimal = Decimal(swap_quote.min_to_amount) / Decimal(10 ** to_token["decimals"])
    
    print(f"Receive Amount: {to_amount_decimal:.{to_token['decimals']}} {to_token['symbol']}")
    print(f"Min Receive Amount: {min_to_amount_decimal:.{to_token['decimals']}} {to_token['symbol']}")
    print(f"Send Amount: {from_amount_decimal:.{from_token['decimals']}} {from_token['symbol']}")
    
    # Calculate and display price ratios
    # Calculate exchange rate: How many to_tokens per 1 from_token
    from_to_to_rate = float(to_amount_decimal / from_amount_decimal)
    
    # Calculate minimum exchange rate with slippage applied
    min_from_to_to_rate = float(min_to_amount_decimal / from_amount_decimal)
    
    # Calculate maximum to_token to from_token ratio with slippage
    max_to_to_from_rate = float(from_amount_decimal / min_to_amount_decimal)

    # Calculate exchange rate: How many from_tokens per 1 to_token
    to_to_from_rate = float(from_amount_decimal / to_amount_decimal)
    
    print("\nToken Price Calculations:")
    print("------------------------")
    print(f"1 {from_token['symbol']} = {from_to_to_rate:.{to_token['decimals']}} {to_token['symbol']}")
    print(f"1 {to_token['symbol']} = {to_to_from_rate:.{from_token['decimals']}} {from_token['symbol']}")
    
    # Calculate effective exchange rate with slippage applied
    print("\nWith Slippage Applied (Worst Case):")
    print("----------------------------------")
    print(f"1 {from_token['symbol']} = {min_from_to_to_rate:.{to_token['decimals']}} {to_token['symbol']} (minimum)")
    print(f"1 {to_token['symbol']} = {max_to_to_from_rate:.{from_token['decimals']}} {from_token['symbol']} (maximum)")
    
    price_impact = ((from_to_to_rate - min_from_to_to_rate) / from_to_to_rate * 100) if from_to_to_rate > 0 else 0
    print(f"Maximum price impact: {price_impact:.2f}%")
    
    print("\nSuggested Gas Details:")
    print("----------------------------------")
    if hasattr(swap_quote, 'gas_limit') and swap_quote.gas_limit:
        print(f"Gas: {swap_quote.gas_limit}")
    if hasattr(swap_quote, 'gas_price') and swap_quote.gas_price:
        print(f"Gas Price: {swap_quote.gas_price}")


def validate_swap(swap_quote) -> bool:
    """Validate the swap for any issues.
    
    Args:
        swap_quote: The swap transaction data
        
    Returns:
        bool: True if swap is valid, False if there are issues
    """
    print("\nValidating Swap Quote:")
    print("---------------------")
    
    # Since we already checked for SwapUnavailableResult above, we know liquidity is available
    print("✅ Liquidity available")
    
    # Check for balance issues (this would need to be implemented based on the actual quote structure)
    # if hasattr(swap_quote, 'issues') and hasattr(swap_quote.issues, 'balance') and swap_quote.issues.balance:
    #     print("\n❌ Balance Issues:")
    #     print(f"Current Balance: {swap_quote.issues.balance.current_balance}")
    #     print(f"Required Balance: {swap_quote.issues.balance.required_balance}")
    #     print(f"Token: {swap_quote.issues.balance.token}")
    #     print("\nInsufficient balance. Please add funds to your smart account.")
    #     return False
    # else:
    print("✅ Sufficient balance")

    # if hasattr(swap_quote, 'issues') and hasattr(swap_quote.issues, 'simulation_incomplete') and swap_quote.issues.simulation_incomplete:
    #     print("⚠️ WARNING: Simulation incomplete. User operation may fail.")
    # else:
    print("✅ Simulation complete")
    
    return True


if __name__ == "__main__":
    asyncio.run(main()) 