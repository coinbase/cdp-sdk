#!/usr/bin/env python3
"""Safe CDP connectivity + scanner smoke test on Base Sepolia (read-only)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agent.cdp_wallet import CdpWalletManager
from agent.scanner import MultiProtocolScanner
from config.settings import load_settings


async def main() -> None:
    settings = load_settings("base-sepolia")
    wallet = CdpWalletManager(settings)
    bundle = await wallet.initialize()

    print("✓ CDP Smart Account:", bundle.smart_account.address)
    print("✓ Owner EOA:", bundle.owner.address)
    print("✓ Network:", settings.network)
    print("✓ RPC:", settings.rpc_url[:48], "...")

    block = bundle.w3.eth.block_number
    print("✓ Latest block:", block)

    scanner = MultiProtocolScanner(settings, bundle.w3)
    print("✓ Protocols:", ", ".join(scanner.protocol_names))

    borrowers_by_protocol = await scanner.discover_borrowers(limit=50)
    total = sum(len(v) for v in borrowers_by_protocol.values())
    print(f"✓ Discovered {total} borrowers ({scanner.borrower_stats(borrowers_by_protocol)})")

    targets = await scanner.scan(borrowers_by_protocol)
    print(f"✓ Liquidation targets (HF < {settings.health_factor_threshold}): {len(targets)}")
    for target in targets[:5]:
        print(
            f"  - {target.user[:10]}… HF={target.health_factor:.4f} "
            f"profit≈${target.estimated_profit_usd:.2f}"
        )

    await wallet.close()
    print("\nBase Sepolia smoke test passed.")


if __name__ == "__main__":
    asyncio.run(main())
