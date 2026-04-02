# Usage: uv run python end_user/sign_solana_message.py <user_id>
# Note: This example requires the end user to have an active delegation on their account
# that allows the developer to sign on their behalf.

import asyncio
import base64
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python end_user/sign_solana_message.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]
    message = base64.b64encode(b"Hello, World!").decode("utf-8")

    async with CdpClient() as cdp:
        try:
            # Get the end user to retrieve their Solana account address.
            end_user = await cdp.end_user.get_end_user(user_id=user_id)
            address = end_user.solana_accounts[0].address

            # Sign a Solana message using the client method.
            result = await cdp.end_user.sign_solana_message(
                user_id=user_id,
                address=address,
                message=message,
            )

            print("Signature (client method):", result.signature)

            # Alternatively, sign a Solana message using the account method.
            # result = await end_user.sign_solana_message(
            #     message=message,
            #     address=address,
            # )

            # print("Signature (account method):", result.signature)

        except Exception as e:
            print(f"Error signing Solana message: {e}")
            raise e


asyncio.run(main())
