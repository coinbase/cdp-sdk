# Usage: uv run python evm/defi-lend/get_vault.py <VAULT_ID>

import asyncio
import sys

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main(vault_id: str) -> None:
    async with CdpClient() as cdp:
        vault = await cdp.lend.get_vault(vault_id)

        apy = vault.metrics.apy_bps if vault.metrics else None
        tvl = vault.metrics.tvl if vault.metrics else None
        print(f"Vault: {vault.vault_id}")
        print(f"Address: {vault.address}")
        print(f"Status: {vault.status.value}")
        print(f"Underlying asset: {vault.underlying_asset} on {vault.network.value}")
        print(f"Performance fee: {vault.performance_fee_bps} bps")
        print(f"APY: {apy} bps")
        print(f"TVL: {tvl}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: uv run python evm/defi-lend/get_vault.py <VAULT_ID>")
        sys.exit(1)

    asyncio.run(main(sys.argv[1]))
