# Usage: uv run python end_user/create_evm_eip7702_delegation.py <user_id>
# Note: This example requires the end user to have an active delegation on their account
# that allows the developer to sign on their behalf.

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python end_user/create_evm_eip7702_delegation.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]

    async with CdpClient() as cdp:
        try:
            # Create an EIP-7702 delegation using the client method.
            result = await cdp.end_user.create_evm_eip7702_delegation(
                user_id=user_id,
                network="base-sepolia",
            )

            print("Delegation operation ID (client method):", result.delegation_operation_id)

            # Alternatively, create an EIP-7702 delegation using the account method.
            # end_user = await cdp.end_user.get_end_user(user_id=user_id)

            # result = await end_user.create_evm_eip7702_delegation(
            #     network="base-sepolia",
            # )

            # print("Delegation operation ID (account method):", result.delegation_operation_id)

        except Exception as e:
            print(f"Error creating EIP-7702 delegation: {e}")
            raise e


asyncio.run(main())
