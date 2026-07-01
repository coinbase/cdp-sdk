"""Shared pytest fixtures for desktop-agent unit tests."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from web3 import Web3

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agent.models import LiquidationTarget
from config.settings import AgentSettings

WETH_BASE = "0x4200000000000000000000000000000000000006"
USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
TEST_USER = "0x3c3CfA1dD813e4469DD5FD6662bc858AaA40E531"
AAVE_FL = "0x9157C22aF171Ae1CE9A81cDc4d36e9D5708192F0"
MORPHO_FL = "0x1111111111111111111111111111111111111112"
ORACLE = "0x2222222222222222222222222222222222222222"
IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687"


@pytest.fixture
def settings() -> AgentSettings:
    return AgentSettings(
        network="base",
        rpc_url="https://mainnet.base.org",
        chain_id=8453,
        cdp_api_key_id="test-key",
        cdp_api_key_secret="test-secret",
        cdp_wallet_secret="test-wallet",
        owner_private_key="0x" + "11" * 32,
        paymaster_rpc_url="https://mainnet.base.org",
        flash_liquidator_address=AAVE_FL,
        min_profit_usd=5.0,
        health_factor_threshold=1.0,
        scan_interval_seconds=12,
        dashboard_host="127.0.0.1",
        dashboard_port=8787,
        execute_enabled=False,
        openai_api_key=None,
        anthropic_api_key=None,
        borrower_cache_dir=ROOT / "data" / "borrowers",
        enabled_protocols=("aave-v3", "morpho"),
        watch_hf_threshold=1.05,
        slippage_bps=50,
        simulate_before_execute=True,
        morpho_flash_liquidator_address=MORPHO_FL,
        oneinch_api_key=None,
        swap_quote_provider="kyber",
        agent_name="test-agent",
        smart_account_address=TEST_USER,
    )


@pytest.fixture
def mock_wallet():
    wallet = MagicMock()
    wallet.bundle.w3 = Web3()
    wallet.bundle.smart_account.address = TEST_USER
    return wallet


@pytest.fixture
def aave_target() -> LiquidationTarget:
    return LiquidationTarget(
        protocol_id="aave-v3",
        protocol_name="Aave V3",
        user=TEST_USER,
        health_factor=0.95,
        total_collateral_usd=10_000.0,
        total_debt_usd=5_000.0,
        collateral_asset=WETH_BASE,
        collateral_symbol="WETH",
        debt_asset=USDC_BASE,
        debt_symbol="USDC",
        debt_to_cover=1_000_000_000,
        debt_to_cover_human=1000.0,
        estimated_profit_usd=50.0,
        swap_fee=500,
        flash_amount=1_000_000_000,
        liquidation_bonus_bps=500,
        executable=True,
        debt_decimals=6,
        collateral_decimals=18,
    )


@pytest.fixture
def morpho_target() -> LiquidationTarget:
    return LiquidationTarget(
        protocol_id="morpho",
        protocol_name="Morpho Blue",
        user=TEST_USER,
        health_factor=0.92,
        total_collateral_usd=8_000.0,
        total_debt_usd=4_000.0,
        collateral_asset=WETH_BASE,
        collateral_symbol="WETH",
        debt_asset=USDC_BASE,
        debt_symbol="USDC",
        debt_to_cover=2_000_000_000,
        debt_to_cover_human=2000.0,
        estimated_profit_usd=75.0,
        swap_fee=500,
        flash_amount=2_000_000_000,
        liquidation_bonus_bps=800,
        executable=True,
        oracle_address=ORACLE,
        irm_address=IRM,
        lltv_wad=860000000000000000,
        repaid_shares=1_500_000_000_000_000_000,
        debt_decimals=6,
        collateral_decimals=18,
    )
