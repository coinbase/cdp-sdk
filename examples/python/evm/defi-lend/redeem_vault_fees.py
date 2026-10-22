# Usage: uv run python evm/defi-lend/redeem_vault_fees.py <VAULT_ID> <FEE_RECIPIENT_ADDRESS>

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main(vault_id: str, fee_recipient_address: str) -> None:
    async with CdpClient() as cdp:
        account = await cdp.evm.get_account(address=fee_recipient_address)

        transaction_hash = await account.redeem_vault_fees(vault_id=vault_id)

        print(f"Redeemed vault fees for account: {account.address}")
        print(f"Transaction hash: {transaction_hash}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: uv run python evm/defi-lend/redeem_vault_fees.py "
            "<VAULT_ID> <FEE_RECIPIENT_ADDRESS>"
        )
        sys.exit(1)

    asyncio.run(main(sys.argv[1], sys.argv[2]))
