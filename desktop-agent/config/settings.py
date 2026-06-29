"""Environment and network configuration for the desktop liquidation agent."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


def _normalize_private_key(key: str | None) -> str | None:
    if not key:
        return None
    key = key.strip()
    if not key.startswith("0x"):
        key = f"0x{key}"
    return key


@dataclass(frozen=True)
class AgentSettings:
    network: str
    rpc_url: str
    chain_id: int
    cdp_api_key_id: str
    cdp_api_key_secret: str
    cdp_wallet_secret: str
    owner_private_key: str
    paymaster_rpc_url: str | None
    flash_liquidator_address: str | None
    min_profit_usd: float
    health_factor_threshold: float
    scan_interval_seconds: int
    dashboard_host: str
    dashboard_port: int
    execute_enabled: bool
    openai_api_key: str | None
    anthropic_api_key: str | None
    borrower_cache_path: Path
    agent_name: str


BASE_MAINNET = {
    "network": "base",
    "chain_id": 8453,
    "default_rpc": "https://mainnet.base.org",
}

BASE_SEPOLIA = {
    "network": "base-sepolia",
    "chain_id": 84532,
    "default_rpc": "https://sepolia.base.org",
}


def load_settings(network_override: str | None = None) -> AgentSettings:
    network_mode = (network_override or os.getenv("AGENT_NETWORK", "base")).lower()
    profile = BASE_MAINNET if network_mode == "base" else BASE_SEPOLIA

    api_key_id = os.getenv("CDP_API_KEY_ID") or os.getenv("CDP_API_KEY_NAME") or os.getenv("CDP_API_KEY")
    api_key_secret = os.getenv("CDP_API_KEY_SECRET") or os.getenv("CDP_PRIVATE_KEY")
    wallet_secret = os.getenv("CDP_WALLET_SECRET")
    owner_key = _normalize_private_key(
        os.getenv("EOA_PRIVATE_KEY") or os.getenv("PRIVATE_KEY_2") or os.getenv("OWNER_PRIVATE_KEY")
    )

    if not api_key_id or not api_key_secret:
        raise ValueError(
            "Missing CDP credentials. Set CDP_API_KEY + CDP_PRIVATE_KEY "
            "(or CDP_API_KEY_ID + CDP_API_KEY_SECRET)."
        )
    if not wallet_secret:
        raise ValueError("Missing CDP_WALLET_SECRET for MPC wallet signing.")
    if not owner_key:
        raise ValueError("Missing EOA_PRIVATE_KEY for smart account owner.")

    rpc_url = os.getenv("BASE_RPC_ENDPOINT") or os.getenv("RPC_URL") or profile["default_rpc"]
    paymaster_rpc = os.getenv("PAYMASTER_RPC_URL") or os.getenv("BASE_RPC_ENDPOINT")

    return AgentSettings(
        network=profile["network"],
        rpc_url=rpc_url,
        chain_id=profile["chain_id"],
        cdp_api_key_id=api_key_id,
        cdp_api_key_secret=api_key_secret,
        cdp_wallet_secret=wallet_secret,
        owner_private_key=owner_key,
        paymaster_rpc_url=paymaster_rpc,
        flash_liquidator_address=os.getenv("FLASH_LIQUIDATOR_ADDRESS"),
        min_profit_usd=float(os.getenv("MIN_PROFIT_USD", "5.0")),
        health_factor_threshold=float(os.getenv("HEALTH_FACTOR_THRESHOLD", "1.0")),
        scan_interval_seconds=int(os.getenv("SCAN_INTERVAL_SECONDS", "12")),
        dashboard_host=os.getenv("DASHBOARD_HOST", "0.0.0.0"),
        dashboard_port=int(os.getenv("DASHBOARD_PORT", "8787")),
        execute_enabled=os.getenv("EXECUTE_ENABLED", "false").lower() == "true",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        borrower_cache_path=ROOT_DIR / "data" / "borrowers.json",
        agent_name=os.getenv("AGENT_NAME", "cdp-flash-liquidator"),
    )
