#!/usr/bin/env python3
# Usage: uv run python evm/account_swap.py

"""
Example: Direct Swap with Parameters

This example demonstrates the one-step swap process using SwapOptions.
This is the simplest way to perform a swap when you don't need to
inspect the quote details before execution.
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from cdp.actions.evm.swap import SwapOptions
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Execute a direct swap using SwapOptions."""
    async with CdpClient() as cdp:
        # Get or create an account
        print("Getting account...")
        account = await cdp.evm.get_or_create_account(name="swap-example")
        print(f"Account address: {account.address}")
        
        # Check initial balances
        print("\n💰 Checking balances...")
        balances = await account.list_token_balances("base")
        
        usdc_balance = None
        weth_balance = None
        
        for balance in balances.balances:
            if balance.token.symbol == "USDC":
                usdc_balance = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                print(f"   USDC balance: {usdc_balance:.2f}")
            elif balance.token.symbol == "WETH":
                weth_balance = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                print(f"   WETH balance: {weth_balance:.6f}")
        
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        # Execute direct swap
        print("\n💱 Executing swap: 5 USDC → WETH")
        
        try:
            # Execute swap with direct parameters
            result = await account.swap(
                SwapOptions(
                    network="base",
                    from_token=USDC,
                    to_token=WETH,
                    from_amount="5000000",  # 5 USDC (6 decimals)
                    taker=account.address,
                    slippage_bps=200  # 2% slippage
                )
            )
            
            # Alternative: Using a pre-created quote
            # quote = await cdp.evm.create_swap_quote(
            #     from_token=USDC,
            #     to_token=WETH,
            #     from_amount="5000000",
            #     network="base",
            #     taker=account.address,
            #     slippage_bps=200
            # )
            # result = await account.swap(SwapOptions(swap_quote=quote))
            
            print(f"\n✅ Swap executed successfully!")
            print(f"   Transaction hash: {result.transaction_hash}")
            print(f"   Sold: {Decimal(result.from_amount) / Decimal(10**6):.2f} USDC")
            print(f"   Received: {Decimal(result.to_amount) / Decimal(10**18):.6f} WETH")
            print(f"   Quote ID: {result.quote_id}")
            print(f"   View on Basescan: https://basescan.org/tx/{result.transaction_hash}")
            
            # Wait a bit for transaction to be mined
            print("\n⏳ Waiting for transaction to be mined...")
            await asyncio.sleep(5)
            
            # Check balances after swap
            print("\n💰 Checking balances after swap...")
            balances_after = await account.list_token_balances("base")
            
            for balance in balances_after.balances:
                if balance.token.symbol == "USDC":
                    new_usdc = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                    print(f"   USDC balance: {new_usdc:.2f} (Δ {new_usdc - (usdc_balance or 0):.2f})")
                elif balance.token.symbol == "WETH":
                    new_weth = Decimal(balance.amount.amount) / Decimal(10 ** balance.amount.decimals)
                    print(f"   WETH balance: {new_weth:.6f} (Δ +{new_weth - (weth_balance or 0):.6f})")
            
        except Exception as e:
            print(f"\n❌ Error executing swap: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 