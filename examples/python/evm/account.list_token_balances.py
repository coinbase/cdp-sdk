# Usage: uv run python evm/account.list_token_balances.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="Account1")
        print(f"Account: {account.address}")

        print("Listing token balances for account...")
        balances = await account.list_token_balances(
            network="base-sepolia",
            page_size=10,
        )
        print(f"Balances: {balances}")


asyncio.run(main())
