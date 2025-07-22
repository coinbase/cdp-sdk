#!/usr/bin/env python3
# Usage: uv run python evm/create_swap_quote.py

"""
Example: Create Swap Quote and Execute

This example demonstrates the two-step swap process:
1. Create a swap quote to inspect the details
2. Execute the swap if satisfied with the quote

This approach allows you to show users exactly what they'll receive
before they commit to the swap.
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient

from dotenv import load_dotenv

load_dotenv()


async def main():
    """Create a swap quote and execute it."""
    async with CdpClient() as cdp:
        # Get or create an account
        print("Getting account...")
        account = await cdp.evm.get_or_create_account(name="swap-example")
        print(f"Account address: {account.address}\n")
        
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        # Step 1: Create a swap quote
        print("Step 1: Creating swap quote...")
        quote = await cdp.evm.create_swap_quote(
            from_token=USDC,
            to_token=WETH,
            from_amount="1000000",  # 1 USDC (6 decimals)
            network="base",
            taker=account.address,
            slippage_bps=100,  # 1% slippage
            signer_address=account.address  # This enables quote.execute()
        )
        
        # Check if liquidity is available
        if not quote.liquidity_available:
            print("\n❌ Swap unavailable: Insufficient liquidity")
            print("   Try a smaller amount or a different token pair")
            return
        
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
        
        # Ask for confirmation (in real app, this would be a UI interaction)
        print("\n🔄 Ready to execute swap...")
        
        try:
            # Step 2: Execute the swap using the quote
            print("Executing swap...")
            tx_hash = await quote.execute()
            
            print(f"\n✅ Swap executed successfully!")
            print(f"   Transaction hash: {tx_hash}")
            print(f"   View on Basescan: https://basescan.org/tx/{tx_hash}")
            
        except Exception as e:
            print(f"\n❌ Error executing swap: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 