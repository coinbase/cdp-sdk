# Usage: uv run python end_user/get_end_user.py <user_id>

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python end_user/get_end_user.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]

    async with CdpClient() as cdp:
        try:
            # Get the end user by user ID.
            end_user = await cdp.end_user.get_end_user(user_id=user_id)

            print("End user ID:", end_user.user_id)
            print("EVM accounts:", end_user.evm_accounts)
            print("Solana accounts:", end_user.solana_accounts)

        except Exception as e:
            print(f"Error getting end user: {e}")
            raise e


asyncio.run(main())
