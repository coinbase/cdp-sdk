# Usage: uv run python evm/defi-lend/redeem_vault_fees_with_smart_account.py <VAULT_ID> <FEE_RECIPIENT_ADDRESS> <OWNER_ADDRESS>

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main(vault_id: str, fee_recipient_address: str, owner_address: str) -> None:
    async with CdpClient() as cdp:
        owner = await cdp.evm.get_account(address=owner_address)
        smart_account = await cdp.evm.get_smart_account(
            address=fee_recipient_address,
            owner=owner,
        )

        user_op_hash = await smart_account.redeem_vault_fees(
            vault_id=vault_id,
            use_cdp_paymaster=True,
        )

        print("Sent vault fee redemption, waiting for it to complete...")

        result = await smart_account.wait_for_user_operation(user_op_hash=user_op_hash)

        print(f"Redeemed vault fees for smart account: {smart_account.address}")
        print(f"User operation status: {result.status}")
        if result.status == "complete":
            print(f"Transaction hash: {result.transaction_hash}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "Usage: uv run python evm/defi-lend/redeem_vault_fees_with_smart_account.py "
            "<VAULT_ID> <FEE_RECIPIENT_ADDRESS> <OWNER_ADDRESS>"
        )
        sys.exit(1)

    asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3]))
