# Usage: uv run python evm/get_or_create_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # Single account creation example
        name = "Account1"
        account = await cdp.evm.get_or_create_account(name=name)
        print("Account Address: ", account.address)
        account2 = await cdp.evm.get_or_create_account(name=name)
        print("Account 2 Address: ", account2.address)
        print("Are accounts equal? ", account.address == account2.address)

        # Concurrent account creation example
        account_coros = [
            cdp.evm.get_or_create_account(name="Account"),
            cdp.evm.get_or_create_account(name="Account"),
            cdp.evm.get_or_create_account(name="Account"),
        ]
        accounts = await asyncio.gather(*account_coros)
        for i, acc in enumerate(accounts, 1):
            print(f"EVM Account Address {i + 1}: ", acc.address)


asyncio.run(main())
