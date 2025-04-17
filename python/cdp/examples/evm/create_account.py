# Usage: uv run python cdp/examples/evm/create_account.py

import asyncio
from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    load_dotenv()

    async with CdpClient() as cdp:
        evm_account = await cdp.evm.create_account()
        print(f"Successfully created EVM account: {evm_account.address}")


# Run the async function
asyncio.run(main())
