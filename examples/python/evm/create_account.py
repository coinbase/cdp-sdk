# Usage: uv run python evm/create_account.py

import asyncio

from cdp import CdpClient


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.create_account()
        print(f"Successfully created account: {account.address}")


asyncio.run(main())
