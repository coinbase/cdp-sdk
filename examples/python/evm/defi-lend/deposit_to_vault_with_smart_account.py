# Usage: uv run python evm/defi-lend/deposit_to_vault_with_smart_account.py <VAULT_ID> <SMART_ACCOUNT_ADDRESS> <OWNER_ADDRESS> <AMOUNT>

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main(
    vault_id: str, smart_account_address: str, owner_address: str, amount: str
) -> None:
    async with CdpClient() as cdp:
        owner = await cdp.evm.get_account(address=owner_address)
        smart_account = await cdp.evm.get_smart_account(
            address=smart_account_address,
            owner=owner,
        )

        user_op_hash = await smart_account.deposit_to_vault(
            vault_id=vault_id,
            amount=amount,
            use_cdp_paymaster=True,
        )

        print("Sent vault deposit, waiting for it to complete...")

        result = await smart_account.wait_for_user_operation(user_op_hash=user_op_hash)

        if result.status == "failed":
            print(f"Deposit failed: {user_op_hash}", file=sys.stderr)
            sys.exit(1)

        print(
            f"Deposited {amount} into vault {vault_id} from smart account: {smart_account.address}"
        )
        print(f"User operation status: {result.status}")
        if result.status == "complete":
            print(f"Transaction hash: {result.transaction_hash}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(
            "Usage: uv run python evm/defi-lend/deposit_to_vault_with_smart_account.py "
            "<VAULT_ID> <SMART_ACCOUNT_ADDRESS> <OWNER_ADDRESS> <AMOUNT>"
        )
        sys.exit(1)

    asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]))
