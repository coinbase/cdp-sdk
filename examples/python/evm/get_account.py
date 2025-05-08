# Usage: uv run python evm/get_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.create_account(name="Account1")
        account = await cdp.evm.get_account(address=account.address)
        print("Account Address: ", account.address)
        account = await cdp.evm.get_account(name=account.name)
        print("Account Name: ", account.name)


asyncio.run(main())
