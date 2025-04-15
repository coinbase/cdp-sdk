# Usage: uv run python cdp/examples/solana/create_account.py

import asyncio
from dotenv import load_dotenv
import os

from cdp import CdpClient


async def main():
    load_dotenv()

    cdp = CdpClient(
        api_key_id=os.getenv("CDP_API_KEY_NAME"),
        api_key_secret=os.getenv("CDP_API_KEY_SECRET"),
        wallet_secret=os.getenv("CDP_WALLET_SECRET"),
        base_path=os.getenv("CDP_API_URL"),
    )
    solana_account = await cdp.solana.create_account()
    print(f"Successfully created SOL account: {solana_account.address}")

    await cdp.close()


# Run the async function
asyncio.run(main())
