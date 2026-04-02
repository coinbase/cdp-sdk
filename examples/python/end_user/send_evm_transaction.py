# Usage: uv run python end_user/send_evm_transaction.py <user_id>
# Note: This example requires the end user to have an active delegation on their account
# that allows the developer to sign on their behalf.

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python end_user/send_evm_transaction.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]
    network = "base-sepolia"

    # Example raw transaction hex (a simple 0 ETH transfer to self).
    transaction = "0x02f86c84014a534008082520894000000000000000000000000000000000000000080c0"

    async with CdpClient() as cdp:
        try:
            # Get the end user to retrieve their EVM account address.
            end_user = await cdp.end_user.get_end_user(user_id=user_id)
            address = end_user.evm_accounts[0].address

            # Send an EVM transaction using the client method.
            result = await cdp.end_user.send_evm_transaction(
                user_id=user_id,
                address=address,
                transaction=transaction,
                network=network,
            )

            print("Transaction hash (client method):", result.transaction_hash)

            # Alternatively, send an EVM transaction using the account method.
            # result = await end_user.send_evm_transaction(
            #     transaction=transaction,
            #     network=network,
            #     address=address,
            # )

            # print("Transaction hash (account method):", result.transaction_hash)

        except Exception as e:
            print(f"Error sending EVM transaction: {e}")
            raise e


asyncio.run(main())
