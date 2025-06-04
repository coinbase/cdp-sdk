#!/usr/bin/env python3
# Usage: uv run python evm/account_quote_swap_and_execute.py

"""
Example: Quote and Execute Swap with Account Convenience Method

This example demonstrates the complete flow of using account.quote_swap()
to create a quote and then executing it. This combines the convenience of
the account method with the ability to review quotes before execution.
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Create a swap quote using account method and execute it."""
    async with CdpClient() as cdp:
        # Get or create an account
        print("Getting account...")
        account = await cdp.evm.get_or_create_account(name="swap-example")
        print(f"Account address: {account.address}")
        
        # Check initial balances
        print("\n💰 Initial balances:")
        balances = await account.list_token_balances("base")
        
        usdc_balance = None
        weth_balance = None
        
        for balance in balances.balances:
            if balance.token.symbol == "USDC":
                usdc_balance = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                print(f"   USDC: {usdc_balance:.2f}")
            elif balance.token.symbol == "WETH":
                weth_balance = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                print(f"   WETH: {weth_balance:.6f}")
        
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        # Step 1: Create swap quote using account convenience method
        print("\n📊 Creating swap quote...")
        quote = await account.quote_swap(
            from_token=USDC,
            to_token=WETH,
            from_amount="10000000",  # 10 USDC (6 decimals)
            network="base",
            slippage_bps=200,  # 2% slippage
        )
        
        # Display quote details for user review
        print("\n📋 Swap Quote Details:")
        print(f"   Quote ID: {quote.quote_id}")
        print(f"   Selling: {Decimal(quote.from_amount) / Decimal(10**6):.2f} USDC")
        print(f"   Expected output: {Decimal(quote.to_amount) / Decimal(10**18):.6f} WETH")
        print(f"   Minimum output: {Decimal(quote.min_to_amount) / Decimal(10**18):.6f} WETH")
        print(f"   Max slippage: 2%")
        
        # Calculate and display exchange rate
        from_amount_decimal = Decimal(quote.from_amount) / Decimal(10**6)
        to_amount_decimal = Decimal(quote.to_amount) / Decimal(10**18)
        rate = to_amount_decimal / from_amount_decimal
        print(f"   Exchange rate: 1 USDC = {rate:.8f} WETH")
        
        # Check if signature is required
        if quote.requires_signature:
            print(f"   ⚠️  Permit2 signature required")
        
        # Step 2: Execute the swap
        print("\n🔄 Executing swap...")
        try:
            # Execute directly on the quote
            tx_hash = await quote.execute()
            
            print(f"\n✅ Swap executed successfully!")
            print(f"   Transaction hash: {tx_hash}")
            print(f"   View on Basescan: https://basescan.org/tx/{tx_hash}")
            
            # Wait for transaction to be mined
            print("\n⏳ Waiting for transaction to be mined...")
            await asyncio.sleep(5)
            
            # Check balances after swap
            print("\n💰 Updated balances:")
            balances_after = await account.list_token_balances("base")
            
            for balance in balances_after.balances:
                if balance.token.symbol == "USDC":
                    new_usdc = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                    diff_usdc = new_usdc - (usdc_balance or 0)
                    print(f"   USDC: {new_usdc:.2f} (Δ {diff_usdc:+.2f})")
                elif balance.token.symbol == "WETH":
                    new_weth = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                    diff_weth = new_weth - (weth_balance or 0)
                    print(f"   WETH: {new_weth:.6f} (Δ {diff_weth:+.6f})")
            
            # Summary
            print("\n📈 Swap Summary:")
            print(f"   Sold: {Decimal(quote.from_amount) / Decimal(10**6):.2f} USDC")
            print(f"   Received: {Decimal(quote.to_amount) / Decimal(10**18):.6f} WETH")
            print(f"   Rate: 1 USDC = {rate:.8f} WETH")
            
        except Exception as e:
            print(f"\n❌ Error executing swap: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 