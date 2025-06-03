#!/usr/bin/env python3
# Usage: uv run python evm/account_quote_swap.py

"""
Example: Create Swap Quote with Account Convenience Method

This example demonstrates using the account.quote_swap() convenience method.
This is a shortcut that automatically sets the account as the taker and
enables direct execution via quote.execute().
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Create a swap quote using account convenience method."""
    async with CdpClient() as cdp:
        # Get or create an account
        print("Getting account...")
        account = await cdp.evm.get_or_create_account(name="swap-example")
        print(f"Account address: {account.address}\n")
        
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        # Create a swap quote using the account method
        print("Creating swap quote...")
        quote = await account.quote_swap(
            from_token=USDC,
            to_token=WETH,
            from_amount="2000000",  # 2 USDC (6 decimals)
            network="base",
            slippage_bps=100,  # 1% slippage
        )
        
        # Display the quote details
        print("\n📊 Swap Quote Details:")
        print(f"   Quote ID: {quote.quote_id}")
        print(f"   Selling: {Decimal(quote.from_amount) / Decimal(10**6):.2f} USDC")
        print(f"   Expected output: {Decimal(quote.to_amount) / Decimal(10**18):.6f} WETH")
        print(f"   Minimum output: {Decimal(quote.min_to_amount) / Decimal(10**18):.6f} WETH")
        print(f"   Max slippage: 1%")
        
        # Calculate the exchange rate
        from_amount_decimal = Decimal(quote.from_amount) / Decimal(10**6)
        to_amount_decimal = Decimal(quote.to_amount) / Decimal(10**18)
        rate = to_amount_decimal / from_amount_decimal
        print(f"   Exchange rate: 1 USDC = {rate:.8f} WETH")
        
        # Check if Permit2 signature is required
        if quote.requires_signature:
            print(f"   ⚠️  Permit2 signature required")
        
        # The quote can be executed directly since it was created via account.quote_swap()
        print("\n✅ Quote is ready for execution")
        print("   You can execute it with: await quote.execute()")
        print("   Or pass it to: await account.swap(SwapOptions(swap_quote=quote))")
        
        # Optionally execute the swap
        # print("\n🔄 Executing swap...")
        # try:
        #     tx_hash = await quote.execute()
        #     print(f"\n✅ Swap executed successfully!")
        #     print(f"   Transaction hash: {tx_hash}")
        #     print(f"   View on Basescan: https://basescan.org/tx/{tx_hash}")
        # except Exception as e:
        #     print(f"\n❌ Error executing swap: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 