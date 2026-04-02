# Usage: uv run python end_user/send_user_operation.py <user_id>
# Note: This example requires the end user to have an active delegation on their account
# that allows the developer to sign on their behalf.

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python end_user/send_user_operation.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]
    network = "base-sepolia"

    # Example calls for a user operation (a simple 0 ETH transfer).
    calls = [
        {
            "to": "0x0000000000000000000000000000000000000000",
            "value": "0",
            "data": "0x",
        }
    ]

    async with CdpClient() as cdp:
        try:
            # Get the end user to retrieve their EVM account address.
            end_user = await cdp.end_user.get_end_user(user_id=user_id)
            address = end_user.evm_accounts[0].address

            # Send a user operation using the client method.
            result = await cdp.end_user.send_user_operation(
                user_id=user_id,
                address=address,
                network=network,
                calls=calls,
                use_cdp_paymaster=True,
            )

            print("User op hash (client method):", result.user_op_hash)

            # Alternatively, send a user operation using the account method.
            # result = await end_user.send_user_operation(
            #     network=network,
            #     calls=calls,
            #     address=address,
            #     use_cdp_paymaster=True,
            # )

            # print("User op hash (account method):", result.user_op_hash)

        except Exception as e:
            print(f"Error sending user operation: {e}")
            raise e


asyncio.run(main())
