# Usage: CDP_ACCESS_TOKEN=... uv run python end_user/validate_access_token.py

import asyncio
from cdp import CdpClient
import os
from dotenv import load_dotenv

load_dotenv()

access_token = os.getenv("CDP_ACCESS_TOKEN")

if not access_token:
    raise ValueError("CDP_ACCESS_TOKEN must be set")


async def main():
    async with CdpClient() as cdp:
        try:
            end_user = await cdp.end_user.validate_access_token(
                access_token=access_token,
            )
            print(end_user)
        except Exception as e:
            # Access token is invalid or expired
            raise e


asyncio.run(main()) 