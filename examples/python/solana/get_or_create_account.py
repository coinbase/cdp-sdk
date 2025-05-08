# Usage: uv run python solana/get_or_create_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # Single account creation example
        name = "Account"
        account = await cdp.solana.get_or_create_account(name=name)
        print("Account Address: ", account.address)
        account2 = await cdp.solana.get_or_create_account(name=name)
        print("Account 2 Address: ", account2.address)
        print("Are accounts equal? ", account.address == account2.address)

        # Concurrent account creation example
        account_coros = [
            cdp.solana.get_or_create_account(name="Account"),
            cdp.solana.get_or_create_account(name="Account"),
            cdp.solana.get_or_create_account(name="Account"),
        ]
        accounts = await asyncio.gather(*account_coros)
        for i, acc in enumerate(accounts, 1):
            print(f"Solana Account Address {i + 1}: ", acc.address)


asyncio.run(main())
