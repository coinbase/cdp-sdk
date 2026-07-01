"""Unit tests for liquidation executor calldata encoding."""

from __future__ import annotations

import pytest
from eth_utils import is_hex

from agent.executor import FlashLiquidationExecutor
from agent.protocols.morpho_base import MORPHO_BLUE_BASE
from tests.conftest import TEST_USER


def test_min_swap_out_includes_buffer(morpho_target):
    min_out = FlashLiquidationExecutor._min_swap_out(morpho_target)
    assert min_out == morpho_target.flash_amount + morpho_target.flash_amount // 100


def test_encode_aave_liquidate_call(settings, mock_wallet, aave_target):
    executor = FlashLiquidationExecutor(settings, mock_wallet)
    data = executor.encode_liquidate_call(aave_target)
    assert is_hex(data)
    assert data.startswith("0x")
    assert len(data) > 10


def test_encode_morpho_liquidate_call(settings, mock_wallet, morpho_target):
    executor = FlashLiquidationExecutor(settings, mock_wallet)
    data = executor.encode_liquidate_call(morpho_target)
    assert is_hex(data)
    assert data.startswith("0x")


def test_encode_morpho_call_requires_market_params(settings, mock_wallet, morpho_target):
    executor = FlashLiquidationExecutor(settings, mock_wallet)
    morpho_target.repaid_shares = 0
    with pytest.raises(ValueError, match="missing market params"):
        executor.encode_liquidate_call(morpho_target)


def test_contract_for_routes_by_protocol(settings, mock_wallet, aave_target, morpho_target):
    executor = FlashLiquidationExecutor(settings, mock_wallet)
    assert executor._contract_for(aave_target) == settings.flash_liquidator_address
    assert executor._contract_for(morpho_target) == settings.morpho_flash_liquidator_address


def test_encode_morpho_constructor_args():
    args = FlashLiquidationExecutor.encode_morpho_constructor_args(TEST_USER)
    assert len(args) > 0


def test_encode_aave_constructor_args():
    args = FlashLiquidationExecutor.encode_aave_constructor_args(TEST_USER)
    assert len(args) > 0


def test_morpho_deploy_hint(settings, mock_wallet):
    executor = FlashLiquidationExecutor(settings, mock_wallet)
    hint = executor.get_morpho_deploy_hint()
    assert hint["morpho"] == MORPHO_BLUE_BASE
    assert hint["owner"] == TEST_USER
