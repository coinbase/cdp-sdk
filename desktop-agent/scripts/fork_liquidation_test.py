#!/usr/bin/env python3
"""Fork Base mainnet with Anvil and run read-only liquidation scan against live state."""

from __future__ import annotations

import asyncio
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agent.scanner import AaveLiquidationScanner
from config.settings import load_settings
from web3 import Web3

ANVIL_PORT = 8545
ANVIL_URL = f"http://127.0.0.1:{ANVIL_PORT}"


def start_anvil(rpc_fork: str) -> subprocess.Popen:
    return subprocess.Popen(
        [
            "anvil",
            "--fork-url",
            rpc_fork,
            "--port",
            str(ANVIL_PORT),
            "--chain-id",
            "8453",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


async def main() -> None:
    settings = load_settings("base")
    fork_url = settings.rpc_url
    print(f"Starting Anvil fork of Base @ {fork_url[:40]}...")

    proc = start_anvil(fork_url)
    time.sleep(3)

    try:
        fork_settings = settings
        object.__setattr__(fork_settings, "rpc_url", ANVIL_URL)

        w3 = Web3(Web3.HTTPProvider(ANVIL_URL))
        if not w3.is_connected():
            raise RuntimeError("Anvil fork not reachable")

        print("✓ Anvil connected, block:", w3.eth.block_number)

        scanner = AaveLiquidationScanner(fork_settings, w3)
        borrowers = await scanner.discover_borrowers(limit=100)
        print(f"✓ Borrowers on fork: {len(borrowers)}")

        targets = await scanner.scan(borrowers[:50])
        print(f"✓ Liquidatable targets on fork: {len(targets)}")
        for t in targets[:10]:
            print(
                f"  {t.user[:12]}… HF={t.health_factor:.4f} "
                f"{t.collateral_symbol}/{t.debt_symbol} profit≈${t.estimated_profit_usd:.2f}"
            )

        print("\nFork liquidation scan complete (read-only).")
    finally:
        proc.send_signal(signal.SIGTERM)
        proc.wait(timeout=5)


if __name__ == "__main__":
    asyncio.run(main())
