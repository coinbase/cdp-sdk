#!/usr/bin/env python3
# Usage: uv run python evm/smart_account.swap.py

"""
This example demonstrates the recommended approach for performing token swaps
using smart accounts with the CDP SDK's all-in-one swap pattern.

Why use smart_account.swap() (all-in-one pattern)?
- Simplest developer experience - one function call
- Automatically handles quote creation and execution
- Manages Permit2 signatures transparently
- Built-in error handling for common issues
- Best for 90% of smart account swap use cases

Smart account swaps work similarly to regular account swaps but use user operations
instead of direct transactions. Key differences:

- Smart account address is used as the taker (it owns the tokens)
- Owner signs permit2 messages (not the smart account itself)
- Uses send_swap_operation → send_user_operation instead of send_swap_transaction
- Returns user operation hash instead of transaction hash
- Supports paymaster for gas sponsorship

This example shows two approaches:

Approach 1: All-in-one pattern (RECOMMENDED)
- Uses smart_account.swap() with inline options
- Creates and executes swaps in a single call
- Automatically validates liquidity and throws clear errors
- Minimal code, maximum convenience

Approach 2: Create-then-execute pattern (advanced)
- First creates a swap quote using smart_account.quote_swap()
- Allows inspection of swap details before execution
- Provides more control for complex scenarios
- Use when you need conditional logic based on swap details

Common features:
- Both handle Permit2 signatures automatically for ERC20 swaps
- Both check for and report liquidity issues
- Both require proper token allowances (see handle_token_allowance)
- Both execute via user operations with optional paymaster support

Choose based on your needs:
- Use Approach 1 for simple, direct swaps (recommended)
- Use Approach 2 when you need to inspect details or add custom logic
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient, EncodedCall
from cdp.actions.evm.swap.types import SmartAccountSwapOptions
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
    """Demonstrate smart account swap functionality."""
    print(f"Note: This example is using {NETWORK} network with smart accounts. Make sure you have funds available.")
    
    async with CdpClient() as cdp:
        # Create an owner account for the smart account
        owner_account = await cdp.evm.get_or_create_account(name="SmartAccountOwner")
        print(f"Owner account: {owner_account.address}")

        # Create a smart account
        smart_account = await cdp.evm.get_or_create_smart_account(owner=owner_account, name="SmartAccount")
        print(f"Smart account: {smart_account.address}")

        try:
            # Define the tokens we're working with
            from_token = TOKENS["WETH"]
            to_token = TOKENS["USDC"]
            
            # Set the amount we want to send
            from_amount = parse_units("0.1", from_token["decimals"])  # 0.1 WETH
            
            from_amount_decimal = Decimal(from_amount) / Decimal(10 ** from_token["decimals"])
            print(f"\nInitiating smart account swap: {from_amount_decimal:.6f} {from_token['symbol']} → {to_token['symbol']}")

            # Handle token allowance check and approval if needed (applicable when sending non-native assets only)
            if not from_token["is_native_asset"]:
                await handle_token_allowance(
                    smart_account,
                    from_token["address"],
                    from_token["symbol"],
                    from_amount
                )
            
            # Approach 1: All-in-one pattern (RECOMMENDED)
            print("\n=== APPROACH 1: All-in-one pattern ===")
            
            try:
                # Create and execute the swap in one call - simpler but less control
                result = await smart_account.swap(
                    SmartAccountSwapOptions(
                        network=NETWORK,
                        from_token=from_token["address"],
                        to_token=to_token["address"],
                        from_amount=from_amount,
                        slippage_bps=100,  # 1% slippage tolerance
                        # Optional: paymaster_url="https://paymaster.example.com"
                    )
                )

                """ Alternative - Approach 2: Create swap quote first, inspect it, then send it separately
                # This gives you more control to analyze the swap details before execution
                
                # Step 1: Create the swap quote
                swap_quote = await smart_account.quote_swap(
                    network=NETWORK,
                    from_token=from_token["address"],
                    to_token=to_token["address"],
                    from_amount=from_amount,
                    slippage_bps=100,  # 1% slippage tolerance
                    # Optional: paymaster_url="https://paymaster.example.com"  # For gas sponsorship
                )
                
                # Step 2: Check if liquidity is available
                if not swap_quote.liquidity_available:
                    print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
                    return
                
                # Step 3: Optionally inspect swap details
                to_amount_decimal = Decimal(swap_quote.to_amount) / Decimal(10 ** to_token["decimals"])
                min_to_amount_decimal = Decimal(swap_quote.min_to_amount) / Decimal(10 ** to_token["decimals"])
                print(f"Receive Amount: {to_amount_decimal:.{to_token['decimals']}f} {to_token['symbol']}")
                print(f"Min Receive Amount: {min_to_amount_decimal:.{to_token['decimals']}f} {to_token['symbol']}")
                if hasattr(swap_quote, 'fees') and swap_quote.fees and hasattr(swap_quote.fees, 'gas_fee'):
                    gas_fee_amount = Decimal(swap_quote.fees.gas_fee.amount) / Decimal(10 ** 18)
                    print(f"Gas Fee: {gas_fee_amount:.6f} {swap_quote.fees.gas_fee.token}")
                
                # Step 4: Execute the swap via user operation
                # Option A: Using smart_account.swap() with the pre-created swap quote
                result = await smart_account.swap(
                    SmartAccountSwapOptions(
                        swap_quote=swap_quote,
                    )
                )
                
                # Option B: Using the swap quote's execute() method directly
                # result = await swap_quote.execute()

                """

                print(f"\n✅ Smart account swap submitted successfully!")
                print(f"User operation hash: {result.user_op_hash}")
                print(f"Smart account address: {result.smart_account_address}")
                print(f"Status: {result.status}")

                # Wait for user operation completion
                receipt = await smart_account.wait_for_user_operation(
                    user_op_hash=result.user_op_hash,
                    timeout_seconds=60,
                )

                print("\n🎉 Smart Account Swap User Operation Completed!")
                print(f"Final status: {receipt.status}")
                
                if receipt.status == "complete":
                    print(f"Transaction Explorer: https://basescan.org/tx/{result.user_op_hash}")

            except Exception as error:
                # The all-in-one pattern will throw an error if liquidity is not available
                if "Insufficient liquidity" in str(error):
                    print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
                    print("Try reducing the swap amount or using a different token pair.")
                else:
                    raise error

        except Exception as error:
            print(f"Error executing smart account swap: {error}")


async def handle_token_allowance(
    smart_account,
    token_address: str,
    token_symbol: str,
    from_amount: int
) -> None:
    """
    Handles token allowance check and approval if needed for smart accounts.
    
    Args:
        smart_account: The smart account instance
        token_address: The address of the token to be sent
        token_symbol: The symbol of the token (e.g., WETH, USDC)
        from_amount: The amount to be sent
    """
    print("\n🔐 Checking token allowance for smart account...")
    
    # Check allowance before attempting the swap
    current_allowance = await get_allowance(
        smart_account.address,
        token_address,
        token_symbol
    )
    
    # If allowance is insufficient, approve tokens
    if current_allowance < from_amount:
        from_amount_eth = Web3.from_wei(from_amount, 'ether')
        current_allowance_eth = Web3.from_wei(current_allowance, 'ether')
        print(f"❌ Allowance insufficient. Current: {current_allowance_eth}, Required: {from_amount_eth}")
        
        # Set the allowance to the required amount via user operation
        await approve_token_allowance(
            smart_account,
            token_address,
            PERMIT2_ADDRESS,
            from_amount
        )
        print(f"✅ Set allowance to {from_amount_eth} {token_symbol}")
    else:
        current_allowance_eth = Web3.from_wei(current_allowance, 'ether')
        print(f"✅ Token allowance sufficient. Current: {current_allowance_eth} {token_symbol}")


async def approve_token_allowance(
    smart_account,
    token_address: str,
    spender_address: str,
    amount: int
) -> None:
    """
    Handle approval for token allowance if needed for smart accounts.
    This is necessary when swapping ERC20 tokens (not native ETH).
    The Permit2 contract needs approval to move tokens on behalf of the smart account.
    
    Args:
        smart_account: The smart account instance
        token_address: The token contract address
        spender_address: The address allowed to spend the tokens
        amount: The amount to approve
    """
    print(f"\nApproving token allowance for {token_address} to spender {spender_address}")
    
    # Encode the approve function call
    contract = w3_rpc.eth.contract(address=token_address, abi=ERC20_ABI)
    data = contract.functions.approve(
        Web3.to_checksum_address(spender_address),
        amount
    ).build_transaction({'gas': 0})['data']
    
    # Send the approve transaction via user operation
    user_op_result = await smart_account.send_user_operation(
        network=NETWORK,
        calls=[
            EncodedCall(
                to=token_address,
                data=data,
                value=0,
            )
        ],
    )
    
    print(f"Approval user operation hash: {user_op_result.user_op_hash}")
    
    # Wait for approval user operation to be confirmed
    receipt = await smart_account.wait_for_user_operation(
        user_op_hash=user_op_result.user_op_hash,
    )
    
    print(f"Approval confirmed with status: {receipt.status} ✅")


async def get_allowance(
    owner: str,
    token: str,
    symbol: str
) -> int:
    """
    Check token allowance for the Permit2 contract.
    
    Args:
        owner: The token owner's address (smart account)
        token: The token contract address
        symbol: The token symbol for logging
        
    Returns:
        The current allowance
    """
    print(f"\nChecking allowance for {symbol} ({token}) to Permit2 contract...")
    
    try:
        contract = w3_rpc.eth.contract(address=token, abi=ERC20_ABI)
        allowance = contract.functions.allowance(
            Web3.to_checksum_address(owner),
            Web3.to_checksum_address(PERMIT2_ADDRESS)
        ).call()
        
        allowance_eth = Web3.from_wei(allowance, 'ether')
        print(f"Current allowance: {allowance_eth} {symbol}")
        return allowance
    except Exception as error:
        print(f"Error checking allowance: {error}")
        return 0


if __name__ == "__main__":
    asyncio.run(main()) 