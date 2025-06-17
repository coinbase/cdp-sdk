#!/usr/bin/env python3
# Usage: uv run python evm/get_swap_price.py

"""
Example: Get Swap Price

This example demonstrates how to get a price quote for swapping tokens
without executing the swap. This is useful for displaying estimated
outputs to users before they commit to a swap.
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Get a swap price quote."""
    async with CdpClient() as cdp:
        # Get or create an account to use as the taker
        account = await cdp.evm.get_or_create_account(name="PriceCheckAccount")
        print(f"Using account: {account.address}\n")
        
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        # Get a price quote for swapping 100 USDC to WETH
        print("Getting swap price quote...")
        print(f"From: 100 USDC")
        print(f"To: WETH")
        print(f"Network: Base\n")
        
        try:
            # Get the price quote
            priceQuote = await cdp.evm.get_swap_price(
                from_token=USDC,
                to_token=WETH,
                from_amount="100000000",  # 100 USDC (6 decimals)
                network="base",
                taker=account.address  # Address where the from_token balance is located
            )
            
            # Display the price quote details
            print("📊 Price Quote:")
            print(f"   Quote ID: {priceQuote.quote_id}")
            print(f"   From: {Decimal(priceQuote.from_amount) / Decimal(10**6):.2f} USDC")
            print(f"   To: {Decimal(priceQuote.to_amount) / Decimal(10**18):.6f} WETH")
            
            # Calculate and display the price
            from_amount_decimal = Decimal(priceQuote.from_amount) / Decimal(10**6)
            to_amount_decimal = Decimal(priceQuote.to_amount) / Decimal(10**18)
            price_per_usdc = to_amount_decimal / from_amount_decimal
            
            print(f"   Price: 1 USDC = {price_per_usdc:.8f} WETH")
            print(f"   Expires at: {priceQuote.expires_at}")
            
        except Exception as e:
            print(f"❌ Error getting quote: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 