# Usage: uv run python evm/defi-lend/withdraw_from_vault.py <VAULT_ID> <ACCOUNT_ADDRESS> <AMOUNT|all>

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main(vault_id: str, account_address: str, amount: str) -> None:
    async with CdpClient() as cdp:
        account = await cdp.evm.get_account(address=account_address)

        if amount == "all":
            transaction_hash = await account.withdraw_from_vault(
                vault_id=vault_id, withdraw_all=True
            )
        else:
            transaction_hash = await account.withdraw_from_vault(
                vault_id=vault_id, amount=amount
            )

        print(f"Withdrew {amount} from vault {vault_id} to account: {account.address}")
        print(f"Transaction hash: {transaction_hash}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "Usage: uv run python evm/defi-lend/withdraw_from_vault.py "
            "<VAULT_ID> <ACCOUNT_ADDRESS> <AMOUNT|all>"
        )
        sys.exit(1)

    asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3]))
