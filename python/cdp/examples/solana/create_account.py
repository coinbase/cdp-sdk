# Usage: uv run python cdp/examples/solana/create_account.py

import asyncio

from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    """Contains main function for the Solana account script."""
    load_dotenv()

    async with CdpClient() as cdp:
        solana_account = await cdp.solana.create_account()
        print(f"Successfully created SOL account: {solana_account.address}")


# Run the async function
asyncio.run(main())
