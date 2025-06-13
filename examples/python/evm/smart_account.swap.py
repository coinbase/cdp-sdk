#!/usr/bin/env python3
"""Smart Account Swap Example

This example demonstrates token swaps using Coinbase Smart Accounts with the CDP SDK.

Key differences from regular account swaps:
- Uses user operations instead of direct transactions  
- Owner signs permit2 messages (not the smart account itself)
- Supports paymaster for gas sponsorship
- Returns user operation hash instead of transaction hash
- Requires special signature wrapping for EIP-712 messages

This example shows the all-in-one pattern (RECOMMENDED):
- Uses smart_account.swap() with inline options
- Creates and executes swaps in a single call
- Automatically handles permit2 signatures
- Minimal code, maximum convenience
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from cdp.actions.evm.swap.types import SmartAccountSwapOptions
from cdp.utils import parse_units

# Network configuration
NETWORK = "base"  # Base mainnet

# Token definitions (using Base mainnet token addresses)
TOKENS = {
    "ETH": {
        "address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "symbol": "ETH",
        "decimals": 18,
        "is_native_asset": True,
    },
    "WETH": {
        "address": "0x4200000000000000000000000000000000000006",
        "symbol": "WETH", 
        "decimals": 18,
        "is_native_asset": False,
    },
    "USDC": {
        "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "symbol": "USDC",
        "decimals": 6,
        "is_native_asset": False,
    },
}


async def main():
    """Demonstrate smart account swap functionality."""
    print(f"Note: This example is using {NETWORK} network with smart accounts.")
    print("Make sure you have funds available in your smart account.")
    
    async with CdpClient() as cdp:
        # Create an owner account for the smart account
        owner_account = await cdp.evm.get_or_create_account(name="SmartAccountOwner")
        print(f"\nOwner account: {owner_account.address}")

        # Create a smart account (you will also need to fund it)
        # Option 1: Create a new smart account
        # smart_account = await cdp.evm.create_smart_account(owner=owner_account)
        
        # Option 2: Get an existing funded smart account by address
        smart_account = await cdp.evm.get_smart_account(
            address="0x...",  # Replace with your smart account address
            owner=owner_account
        )
        print(f"Smart account: {smart_account.address}")

        try:
            # Define the tokens we're working with
            from_token = TOKENS["ETH"]
            to_token = TOKENS["USDC"]
            
            # Set the amount we want to send
            from_amount = parse_units("0.000001", from_token["decimals"])  # 0.000001 ETH
            
            from_amount_decimal = Decimal(from_amount) / Decimal(10 ** from_token["decimals"])
            print(f"\nInitiating smart account swap: {from_amount_decimal:.6f} {from_token['symbol']} → {to_token['symbol']}")

            # All-in-one pattern (RECOMMENDED)
            print("\n=== All-in-one pattern ===")
            
            try:
                # Create and execute the swap in one call
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

                print(f"\n✅ Smart account swap submitted successfully!")
                print(f"User operation hash: {result.user_op_hash}")
                print(f"Smart account address: {result.smart_account_address}")
                print(f"Status: {result.status}")

                # Wait for user operation completion
                print(f"⏳ Waiting for user operation confirmation...")
                receipt = await smart_account.wait_for_user_operation(
                    user_op_hash=result.user_op_hash,
                    timeout_seconds=60,
                )

                print("\n🎉 Smart Account Swap User Operation Completed!")
                print(f"Final status: {receipt.status}")
                
                if receipt.status == "complete":
                    print(f"Transaction Explorer: https://basescan.org/tx/{result.user_op_hash}")

            except ValueError as error:
                # The all-in-one pattern will throw an error if liquidity is not available
                if "Insufficient liquidity" in str(error):
                    print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
                    print("Try reducing the swap amount or using a different token pair.")
                else:
                    raise error

            # Alternative - Approach 2: Create swap quote first, inspect it, then send it separately
            # print("\n=== APPROACH 2: Create-then-execute pattern ===")
            # 
            # try:
            #     # Step 1: Create the swap quote
            #     print("🔍 Step 1: Creating smart account swap quote...")
            #     swap_quote = await smart_account.quote_swap(
            #         from_token=from_token["address"],
            #         to_token=to_token["address"],
            #         from_amount=from_amount,
            #         network=NETWORK,
            #         slippage_bps=100,  # 1% slippage tolerance
            #     )
            #     
            #     # Step 2: Check if liquidity is available
            #     if not hasattr(swap_quote, 'liquidity_available') or not swap_quote.liquidity_available:
            #         print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
            #         return
            #     
            #     # Step 3: Optionally inspect swap details
            #     print("\n📊 Step 2: Analyzing smart account swap quote...")
            #     display_swap_quote_details(swap_quote, from_token, to_token)
            #     
            #     # Step 4: Execute the swap via user operation
            #     print("\n🚀 Step 3: Executing swap with pre-created quote...")
            #     result = await smart_account.swap(
            #         SmartAccountSwapOptions(
            #             swap_quote=swap_quote,
            #             # Optional: paymaster_url="https://paymaster.example.com"
            #         )
            #     )
            # 
            #     print(f"\n✅ Smart account swap submitted successfully!")
            #     print(f"User operation hash: {result.user_op_hash}")
            #     print(f"Smart account address: {result.smart_account_address}")
            #     print(f"Status: {result.status}")
            # 
            #     # Wait for user operation completion
            #     receipt = await smart_account.wait_for_user_operation(
            #         user_op_hash=result.user_op_hash,
            #         timeout_seconds=60,
            #     )
            # 
            #     print("\n🎉 Smart Account Swap User Operation Completed!")
            #     print(f"Final status: {receipt.status}")
            #     
            #     if receipt.status == "complete":
            #         print(f"Transaction Explorer: https://basescan.org/tx/{result.user_op_hash}")
            # 
            # except Exception as error:
            #     print(f"Error in create-then-execute pattern: {error}")
            
        except Exception as error:
            print(f"Error executing smart account swap: {error}")


def display_swap_quote_details(swap_quote, from_token: dict, to_token: dict):
    """Display detailed information about the swap quote.
    
    Args:
        swap_quote: The swap quote data
        from_token: The token being sent
        to_token: The token being received
    """
    print("Smart Account Swap Quote Details:")
    print("=================================")
    
    from_amount_decimal = Decimal(swap_quote.from_amount) / Decimal(10 ** from_token["decimals"])
    to_amount_decimal = Decimal(swap_quote.to_amount) / Decimal(10 ** to_token["decimals"])
    min_to_amount_decimal = Decimal(swap_quote.min_to_amount) / Decimal(10 ** to_token["decimals"])
    
    print(f"📤 Sending: {from_amount_decimal:.{from_token['decimals']}} {from_token['symbol']}")
    print(f"📥 Receiving: {to_amount_decimal:.{to_token['decimals']}} {to_token['symbol']}")
    print(f"🔒 Minimum Receive: {min_to_amount_decimal:.{to_token['decimals']}} {to_token['symbol']}")
    
    # Calculate exchange rate
    exchange_rate = float(to_amount_decimal / from_amount_decimal)
    print(f"💱 Exchange Rate: 1 {from_token['symbol']} = {exchange_rate:.2f} {to_token['symbol']}")
    
    # Calculate slippage
    slippage_percent = float((to_amount_decimal - min_to_amount_decimal) / to_amount_decimal * 100)
    print(f"📉 Max Slippage: {slippage_percent:.2f}%")
    
    # Gas information for user operation
    if hasattr(swap_quote, 'gas_limit') and swap_quote.gas_limit:
        print(f"⛽ Estimated Gas: {swap_quote.gas_limit:,}")
    
    # Smart account specific information
    print("\nSmart Account Execution Details:")
    print("-------------------------------")
    print("• Execution method: User Operation")
    print("• Owner will sign Permit2 messages if required")
    print("• Gas can be sponsored via paymaster (optional)")
    print("• Returns user operation hash, not transaction hash")
    print("• Supports batch operations if needed")


if __name__ == "__main__":
    asyncio.run(main()) 