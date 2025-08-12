# Usage: uv run python solana/transactions/account.sign_message.py
import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.create_account()
        response = await account.sign_message(message="Hello, world!")
        print(response)


asyncio.run(main())
