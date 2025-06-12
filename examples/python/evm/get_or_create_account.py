# Usage: uv run python evm/get_or_create_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # Create an EOA account
        account = await cdp.evm.create_account()
        print("Created EOA account:", account.address)

        # Create another EOA account
        another_account = await cdp.evm.create_account()
        print("\nCreated another EOA account:", another_account.address)


asyncio.run(main())
