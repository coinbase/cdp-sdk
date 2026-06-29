#!/usr/bin/env python3
"""Deploy FlashLiquidator to Base using forge + CDP RPC (owner = Smart Account)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import asyncio

from agent.cdp_wallet import CdpWalletManager
from agent.protocols.aave_v3_base import UNISWAP_V3_SWAP_ROUTER_BASE, get_aave_addresses
from config.settings import load_settings

CONTRACTS_DIR = ROOT / "contracts"


def compile_contract() -> None:
    subprocess.run(["forge", "build"], cwd=CONTRACTS_DIR, check=True)


async def deploy(network: str | None = None) -> str:
    settings = load_settings(network)
    compile_contract()

    wallet = CdpWalletManager(settings)
    bundle = await wallet.initialize()
    owner = bundle.smart_account.address
    addresses = get_aave_addresses(settings.network)

    private_key = settings.owner_private_key
    rpc_url = settings.rpc_url

    cmd = [
        "forge",
        "create",
        "src/FlashLiquidator.sol:FlashLiquidator",
        "--rpc-url",
        rpc_url,
        "--private-key",
        private_key,
        "--constructor-args",
        addresses["pool_addresses_provider"],
        UNISWAP_V3_SWAP_ROUTER_BASE,
        owner,
        "--json",
    ]

    result = subprocess.run(cmd, cwd=CONTRACTS_DIR, capture_output=True, text=True, check=True)
    payload = json.loads(result.stdout)
    contract_address = payload["deployedTo"]
    tx_hash = payload.get("transactionHash", "")

    print(f"Deployed FlashLiquidator: {contract_address}")
    print(f"Transaction: {tx_hash}")
    print(f"Owner (Smart Account): {owner}")
    print(f"\nAdd to .env:\nFLASH_LIQUIDATOR_ADDRESS={contract_address}")
    print("\nAdd this contract + liquidate() to your CDP Paymaster allowlist.")

    env_path = ROOT / ".env"
    line = f"FLASH_LIQUIDATOR_ADDRESS={contract_address}\n"
    if env_path.exists():
        content = env_path.read_text()
        if "FLASH_LIQUIDATOR_ADDRESS" in content:
            content = "\n".join(
                line.strip() if l.startswith("FLASH_LIQUIDATOR_ADDRESS") else l
                for l in content.splitlines()
            )
            env_path.write_text(content + "\n")
        else:
            env_path.write_text(content + "\n" + line)
    else:
        env_path.write_text(line)

    await wallet.close()
    return contract_address


if __name__ == "__main__":
    net = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(deploy(net))
