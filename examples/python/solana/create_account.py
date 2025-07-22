# Usage: uv run python solana/create_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.create_account()
        print(f"Successfully created account: {account.address}")


asyncio.run(main())
