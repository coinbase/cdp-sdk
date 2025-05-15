# Usage: uv run python policies/list_policies.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policies = await cdp.policies.list_policies()
        print("Listed policies: ", policies)


asyncio.run(main())
