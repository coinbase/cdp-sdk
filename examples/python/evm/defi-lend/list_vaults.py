# Usage: uv run python evm/defi-lend/list_vaults.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main() -> None:
    async with CdpClient() as cdp:
        page_token = None
        while True:
            page = await cdp.lend.list_vaults(page_token=page_token)

            for vault in page.vaults:
                apy = vault.metrics.apy_bps if vault.metrics else None
                tvl = vault.metrics.tvl if vault.metrics else None
                print(
                    f"{vault.vault_id} {vault.status.value} {vault.underlying_asset} "
                    f"on {vault.network.value}"
                )
                print(f"  APY: {apy} bps")
                print(f"  TVL: {tvl}")

            page_token = page.next_page_token
            if not page_token:
                break


if __name__ == "__main__":
    asyncio.run(main())
