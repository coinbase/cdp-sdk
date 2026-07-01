#!/usr/bin/env python3
"""Deploy FlashLiquidator to Base mainnet.

Primary path: fund `PRIVATE_KEY_2` (or `DEPLOYER_PRIVATE_KEY`) with a small ETH
balance on Base, then deploy via raw transaction.

Fallback path: CDP Smart Account + paymaster via CREATE2 deployer (requires
paymaster allowlist for 0x4e59b44847b379578588920cA78FbF26c0B4956C).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import asyncio

from eth_account import Account
from web3 import Web3

from agent.cdp_wallet import CdpWalletManager
from agent.protocols.aave_v3_base import UNISWAP_V3_SWAP_ROUTER_BASE, get_aave_addresses
from config.settings import load_settings

CONTRACTS_DIR = ROOT / "contracts"
CREATE2_DEPLOYER = "0x4e59b44847b379578588920cA78FbF26c0B4956C"


def compile_contract() -> dict:
    subprocess.run(["forge", "build"], cwd=CONTRACTS_DIR, check=True)
    artifact_path = CONTRACTS_DIR / "out" / "FlashLiquidator.sol" / "FlashLiquidator.json"
    return json.loads(artifact_path.read_text())


def _write_env(contract_address: str) -> None:
    env_path = ROOT / ".env"
    line = f"FLASH_LIQUIDATOR_ADDRESS={contract_address}\n"
    if env_path.exists() and "FLASH_LIQUIDATOR_ADDRESS" in env_path.read_text():
        lines = [
            line.strip() if l.startswith("FLASH_LIQUIDATOR_ADDRESS") else l
            for l in env_path.read_text().splitlines()
        ]
        env_path.write_text("\n".join(lines) + "\n")
    else:
        env_path.write_text((env_path.read_text() if env_path.exists() else "") + line)


def deploy_with_funded_eoa(settings, artifact: dict, owner: str) -> str:
    pk = os.getenv("DEPLOYER_PRIVATE_KEY") or os.getenv("PRIVATE_KEY_2")
    if not pk:
        raise ValueError("Set DEPLOYER_PRIVATE_KEY or PRIVATE_KEY_2 with Base ETH for deployment.")

    if not pk.startswith("0x"):
        pk = f"0x{pk}"

    acct = Account.from_key(pk)
    w3 = Web3(Web3.HTTPProvider(settings.rpc_url))
    addresses = get_aave_addresses(settings.network)

    contract = w3.eth.contract(abi=artifact["abi"], bytecode=artifact["bytecode"]["object"])
    built = contract.constructor(
        Web3.to_checksum_address(addresses["pool_addresses_provider"]),
        Web3.to_checksum_address(UNISWAP_V3_SWAP_ROUTER_BASE),
        Web3.to_checksum_address(owner),
    ).build_transaction({"from": acct.address, "value": 0})

    gas = w3.eth.estimate_gas({"from": acct.address, "data": built["data"]})
    block = w3.eth.get_block("latest")
    max_fee = block["baseFeePerGas"] + w3.to_wei(0.001, "gwei")
    cost = gas * max_fee
    balance = w3.eth.get_balance(acct.address)
    if balance < cost:
        raise ValueError(
            f"Deployer {acct.address} needs ~{cost / 1e18:.6f} ETH, has {balance / 1e18:.6f} ETH"
        )

    tx = contract.constructor(
        Web3.to_checksum_address(addresses["pool_addresses_provider"]),
        Web3.to_checksum_address(UNISWAP_V3_SWAP_ROUTER_BASE),
        Web3.to_checksum_address(owner),
    ).build_transaction(
        {
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address),
            "chainId": settings.chain_id,
            "gas": gas,
            "maxFeePerGas": max_fee,
            "maxPriorityFeePerGas": w3.to_wei(0.001, "gwei"),
        }
    )
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"Deployment tx: {tx_hash.hex()}")

    for _ in range(40):
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt.contractAddress:
                return Web3.to_checksum_address(receipt.contractAddress)
        except Exception:
            time.sleep(2)

    raise RuntimeError("Deployment transaction sent but contract address not found.")


async def deploy(network: str | None = None) -> str:
    settings = load_settings(network)
    artifact = compile_contract()

    wallet = CdpWalletManager(settings)
    bundle = await wallet.initialize()
    owner = bundle.smart_account.address

    print(f"Smart Account owner: {owner}")
    print(f"Network: {settings.network}")

    contract_address = deploy_with_funded_eoa(settings, artifact, owner)
    print(f"\nDeployed FlashLiquidator: {contract_address}")
    print(f"https://basescan.org/address/{contract_address}")
    print("\nAdd FlashLiquidator + liquidate() to CDP Paymaster allowlist for execution.")

    _write_env(contract_address)
    await wallet.close()
    return contract_address


if __name__ == "__main__":
    net = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(deploy(net))
