# Usage: uv run python solana/get_account.py

import asyncio

from cdp import CdpClient


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.create_account()
        account = await cdp.solana.get_account(address=account.address)
        print("Account Address: ", account.address)
        account = await cdp.solana.get_account(name=account.name)
        print("Account Name: ", account.name)


asyncio.run(main())
