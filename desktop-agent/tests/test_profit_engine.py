"""Unit tests for profit estimation and urgency scoring."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from agent.profit_engine import (
    apply_urgency,
    estimate_profit_usd,
    estimate_profit_with_swap_quote,
    morpho_liquidation_incentive_factor,
    urgency_score,
)
from agent.models import LiquidationTarget
from agent.swap_quotes import SwapQuote
from tests.conftest import USDC_BASE, WETH_BASE


def test_morpho_lif_at_86_percent_lltv():
    # LLTV 0.86 → uncapped LIF > 1.15, capped at MAX_LIF
    lif = morpho_liquidation_incentive_factor(860000000000000000)
    assert lif == 1.15


def test_urgency_lower_hf_higher_score():
    assert urgency_score(0.5) > urgency_score(0.9)


def test_estimate_profit_usd_positive_with_bonus():
    profit = estimate_profit_usd(1000.0, liquidation_bonus_bps=500, slippage_bps=50, gas_usd=0.5)
    assert profit > 0


def test_apply_urgency_sorts_by_health_factor():
    targets = [
        LiquidationTarget(
            protocol_id="aave-v3",
            protocol_name="Aave V3",
            user="0x1",
            health_factor=0.98,
            total_collateral_usd=1,
            total_debt_usd=1,
            collateral_asset=WETH_BASE,
            collateral_symbol="WETH",
            debt_asset=USDC_BASE,
            debt_symbol="USDC",
            debt_to_cover=1,
            debt_to_cover_human=1.0,
            estimated_profit_usd=10.0,
            swap_fee=500,
            flash_amount=1,
            liquidation_bonus_bps=500,
        ),
        LiquidationTarget(
            protocol_id="aave-v3",
            protocol_name="Aave V3",
            user="0x2",
            health_factor=0.80,
            total_collateral_usd=1,
            total_debt_usd=1,
            collateral_asset=WETH_BASE,
            collateral_symbol="WETH",
            debt_asset=USDC_BASE,
            debt_symbol="USDC",
            debt_to_cover=1,
            debt_to_cover_human=1.0,
            estimated_profit_usd=5.0,
            swap_fee=500,
            flash_amount=1,
            liquidation_bonus_bps=500,
        ),
    ]
    ranked = apply_urgency(targets)
    assert ranked[0].health_factor == 0.80


@pytest.mark.asyncio
async def test_estimate_profit_with_swap_quote_uses_live_quote(settings):
    quote = SwapQuote(
        token_in=WETH_BASE,
        token_out=USDC_BASE,
        amount_in=10**18,
        amount_out=2_100_000_000,
        provider="kyber",
        gas_usd=0.1,
    )
    with patch("agent.profit_engine.get_swap_quote", new_callable=AsyncMock, return_value=quote):
        profit, source = await estimate_profit_with_swap_quote(
            settings,
            collateral_asset=WETH_BASE,
            debt_asset=USDC_BASE,
            collateral_amount=10**18,
            debt_to_cover_human=2000.0,
            liquidation_bonus_bps=500,
            debt_decimals=6,
            flash_fee_bps=0,
        )
    assert source == "kyber"
    assert profit > 0


@pytest.mark.asyncio
async def test_estimate_profit_falls_back_to_heuristic(settings):
    with patch("agent.profit_engine.get_swap_quote", new_callable=AsyncMock, return_value=None):
        profit, source = await estimate_profit_with_swap_quote(
            settings,
            collateral_asset=WETH_BASE,
            debt_asset=USDC_BASE,
            collateral_amount=10**18,
            debt_to_cover_human=100.0,
            liquidation_bonus_bps=500,
            debt_decimals=6,
        )
    assert source == "heuristic"
    assert isinstance(profit, float)
