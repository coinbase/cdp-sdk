# Usage: uv run python cdp/examples/solana/create_account.py

import asyncio
from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    load_dotenv()

    cdp = CdpClient()
    solana_account = await cdp.solana.create_account()
    print(f"Successfully created SOL account: {solana_account.address}")

    await cdp.close()


# Run the async function
asyncio.run(main())
