# Usage: uv run python evm/defi-lend/list_lend_positions.py <ADDRESS> [VAULT_ID...]

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main(address: str, vault_ids: list[str]) -> None:
    async with CdpClient() as cdp:
        page_token = None
        while True:
            page = await cdp.lend.list_lend_positions(
                address,
                vault_ids=vault_ids or None,
                page_token=page_token,
            )

            for position in page.lend_positions:
                print(f"{position.vault_id} on {position.network.value}")
                print(f"  Shares: {position.vault_shares}")
                print(
                    f"  Balance: {position.asset_balance} {position.underlying_asset}"
                )

            page_token = page.next_page_token
            if not page_token:
                break


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: uv run python evm/defi-lend/list_lend_positions.py <ADDRESS> [VAULT_ID...]"
        )
        sys.exit(1)

    asyncio.run(main(sys.argv[1], sys.argv[2:]))
