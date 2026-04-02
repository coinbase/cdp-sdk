# Usage: uv run python end_user/revoke_delegation.py <user_id>
# Note: This example requires the end user to have an active delegation on their account
# that allows the developer to sign on their behalf.

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python end_user/revoke_delegation.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]

    async with CdpClient() as cdp:
        try:
            # Revoke delegation using the client method.
            await cdp.end_user.revoke_delegation(user_id=user_id)

            print("Revoked delegation (client method) for user:", user_id)

            # Alternatively, revoke delegation using the account method.
            # end_user = await cdp.end_user.get_end_user(user_id=user_id)

            # await end_user.revoke_delegation()

            # print("Revoked delegation (account method) for user:", user_id)

        except Exception as e:
            print(f"Error revoking delegation: {e}")
            raise e


asyncio.run(main())
