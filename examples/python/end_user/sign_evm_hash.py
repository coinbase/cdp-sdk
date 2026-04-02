# Usage: uv run python end_user/sign_evm_hash.py <user_id>
# Note: This example requires the end user to have an active delegation on their account
# that allows the developer to sign on their behalf.

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python end_user/sign_evm_hash.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]
    hash_to_sign = "0x" + "ab" * 32

    async with CdpClient() as cdp:
        try:
            # Get the end user to retrieve their EVM account address.
            end_user = await cdp.end_user.get_end_user(user_id=user_id)
            address = end_user.evm_accounts[0].address

            # Sign an EVM hash using the client method.
            result = await cdp.end_user.sign_evm_hash(
                user_id=user_id,
                hash=hash_to_sign,
                address=address,
            )

            print("Signature (client method):", result.signature)

            # Alternatively, sign an EVM hash using the account method.
            # result = await end_user.sign_evm_hash(
            #     hash=hash_to_sign,
            #     address=address,
            # )

            # print("Signature (account method):", result.signature)

        except Exception as e:
            print(f"Error signing EVM hash: {e}")
            raise e


asyncio.run(main())
