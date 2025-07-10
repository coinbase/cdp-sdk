# Usage: uv run python solana/list_token_balances.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        address = "4PkiqJkUvxr9P8C1UsMqGN8NJsUcep9GahDRLfmeu8UK"
        token_balances = await cdp.solana.list_token_balances(
            address,
            network="solana-devnet",
            page_size=3,
        )

        print("First page:")
        for balance in token_balances.balances:
            print(f"Balance amount: {balance.amount.amount}")
            print(f"Balance decimals: {balance.amount.decimals}")
            print(f"Balance token mint address: {balance.token.mint_address}")

        if token_balances.next_page_token:
            token_balances = await cdp.solana.list_token_balances(
                address,
                network="solana-devnet",
                page_size=2,
                page_token=token_balances.next_page_token,
            )

            print("Second page:")
            for balance in token_balances.balances:
                print(f"Balance amount: {balance.amount.amount}")
                print(f"Balance decimals: {balance.amount.decimals}")
                print(f"Balance token mint address: {balance.token.mint_address}")


asyncio.run(main())
