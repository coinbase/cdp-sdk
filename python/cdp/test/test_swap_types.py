"""Unit tests for swap types."""

import pytest
from pydantic import ValidationError

from cdp.actions.evm.swap.types import SwapOptions, SwapQuote, SwapResult


class TestSwapOptions:
    """Test SwapOptions model."""

    def test_swap_options_valid(self):
        """Test creating valid SwapOptions."""
        options = SwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",
            network="base",
            slippage_percentage=0.5,
        )
        assert options.from_asset == "eth"
        assert options.to_asset == "usdc"
        assert options.amount == "1000000000000000000"
        assert options.network == "base"
        assert options.slippage_percentage == 0.5

    def test_swap_options_int_amount(self):
        """Test SwapOptions with integer amount."""
        options = SwapOptions(
            from_asset="usdc",
            to_asset="eth",
            amount=1000000,
            network="base",
        )
        assert options.amount == 1000000

    def test_swap_options_default_slippage(self):
        """Test SwapOptions with default slippage."""
        options = SwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",
            network="base",
        )
        assert options.slippage_percentage == 0.5

    def test_swap_options_invalid_slippage_negative(self):
        """Test SwapOptions with negative slippage."""
        with pytest.raises(ValidationError) as exc_info:
            SwapOptions(
                from_asset="eth",
                to_asset="usdc",
                amount="1000000000000000000",
                network="base",
                slippage_percentage=-1,
            )
        assert "Slippage percentage must be between 0 and 10" in str(exc_info.value)

    def test_swap_options_invalid_slippage_too_high(self):
        """Test SwapOptions with slippage too high."""
        with pytest.raises(ValidationError) as exc_info:
            SwapOptions(
                from_asset="eth",
                to_asset="usdc",
                amount="1000000000000000000",
                network="base",
                slippage_percentage=15,
            )
        assert "Slippage percentage must be between 0 and 10" in str(exc_info.value)

    def test_swap_options_contract_addresses(self):
        """Test SwapOptions with contract addresses."""
        options = SwapOptions(
            from_asset="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            to_asset="0x4200000000000000000000000000000000000006",
            amount="1000000",
            network="base",
        )
        assert options.from_asset == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        assert options.to_asset == "0x4200000000000000000000000000000000000006"


class TestSwapQuote:
    """Test SwapQuote model."""

    def test_swap_quote_valid(self):
        """Test creating valid SwapQuote."""
        quote = SwapQuote(
            from_asset="eth",
            to_asset="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            price_impact=0.1,
            route=[
                "0x0000000000000000000000000000000000000000",
                "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            ],
            gas_estimate="100000",
            expires_at=1234567890,
        )
        assert quote.from_asset == "eth"
        assert quote.to_asset == "usdc"
        assert quote.from_amount == "1000000000000000000"
        assert quote.to_amount == "2000000000"
        assert quote.price_impact == 0.1
        assert len(quote.route) == 2
        assert quote.gas_estimate == "100000"
        assert quote.expires_at == 1234567890

    def test_swap_quote_minimal(self):
        """Test creating SwapQuote with minimal fields."""
        quote = SwapQuote(
            from_asset="eth",
            to_asset="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            price_impact=0.1,
            route=[],
        )
        assert quote.gas_estimate is None
        assert quote.expires_at is None


class TestSwapResult:
    """Test SwapResult model."""

    def test_swap_result_valid(self):
        """Test creating valid SwapResult."""
        result = SwapResult(
            transaction_hash="0xabc123",
            from_asset="eth",
            to_asset="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            status="completed",
        )
        assert result.transaction_hash == "0xabc123"
        assert result.from_asset == "eth"
        assert result.to_asset == "usdc"
        assert result.from_amount == "1000000000000000000"
        assert result.to_amount == "2000000000"
        assert result.status == "completed"

    def test_swap_result_pending_status(self):
        """Test SwapResult with pending status."""
        result = SwapResult(
            transaction_hash="0xdef456",
            from_asset="usdc",
            to_asset="eth",
            from_amount="1000000",
            to_amount="500000000000000",
            status="pending",
        )
        assert result.status == "pending"
