"""Unit tests for swap types."""

import pytest
from pydantic import ValidationError

from cdp.actions.evm.swap.types import (
    CreateSwapOptions,
    CreateSwapResult,
    SwapOptions,
    SwapQuote,
    SwapResult,
)


class TestCreateSwapOptions:
    """Tests for CreateSwapOptions."""

    def test_create_swap_options_valid(self):
        """Test creating valid CreateSwapOptions."""
        options = CreateSwapOptions(
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

    def test_create_swap_options_int_amount(self):
        """Test CreateSwapOptions with integer amount."""
        options = CreateSwapOptions(
            from_asset="usdc",
            to_asset="eth",
            amount=1000000,
            network="ethereum",
        )
        assert options.amount == "1000000"  # Converted to string
        assert options.network == "ethereum"

    def test_create_swap_options_default_slippage(self):
        """Test CreateSwapOptions with default slippage."""
        options = CreateSwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",
            network="base",
        )
        assert options.slippage_percentage == 0.5  # Default value

    def test_create_swap_options_invalid_network(self):
        """Test CreateSwapOptions with unsupported network."""
        with pytest.raises(ValidationError) as exc_info:
            CreateSwapOptions(
                from_asset="eth",
                to_asset="usdc",
                amount="1000000000000000000",
                network="polygon",  # Not supported
            )
        assert "Network must be one of: base, ethereum" in str(exc_info.value)

    def test_create_swap_options_invalid_slippage(self):
        """Test CreateSwapOptions with invalid slippage."""
        with pytest.raises(ValidationError) as exc_info:
            CreateSwapOptions(
                from_asset="eth",
                to_asset="usdc",
                amount="1000000000000000000",
                network="base",
                slippage_percentage=-1,
            )
        assert "Slippage percentage must be between 0 and 100" in str(exc_info.value)


class TestSwapOptions:
    """Tests for SwapOptions."""

    def test_swap_options_with_create_options(self):
        """Test SwapOptions with CreateSwapOptions."""
        create_options = CreateSwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",
            network="base",
        )
        options = SwapOptions(create_swap_options=create_options)
        assert options.create_swap_options == create_options
        assert options.create_swap_result is None

    def test_swap_options_with_create_result(self):
        """Test SwapOptions with CreateSwapResult."""
        create_result = CreateSwapResult(
            quote_id="quote-123",
            from_token="eth",
            to_token="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            to="0xSwapRouter",
            data="0x1234abcd",
            value="0",
        )
        options = SwapOptions(create_swap_result=create_result)
        assert options.create_swap_result == create_result
        assert options.create_swap_options is None

    def test_swap_options_mutual_exclusion(self):
        """Test SwapOptions mutual exclusion validation."""
        create_options = CreateSwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",
            network="base",
        )
        create_result = CreateSwapResult(
            quote_id="quote-123",
            from_token="eth",
            to_token="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            to="0xSwapRouter",
            data="0x1234abcd",
            value="0",
        )

        with pytest.raises(ValidationError) as exc_info:
            SwapOptions(
                create_swap_options=create_options,
                create_swap_result=create_result,
            )
        assert "Only one of create_swap_options or create_swap_result can be provided" in str(
            exc_info.value
        )

    def test_swap_options_requires_one(self):
        """Test SwapOptions requires at least one option."""
        with pytest.raises(ValueError) as exc_info:
            SwapOptions()
        assert "Either create_swap_options or create_swap_result must be provided" in str(
            exc_info.value
        )


class TestSwapQuote:
    """Tests for SwapQuote."""

    def test_swap_quote_valid(self):
        """Test creating valid SwapQuote."""
        quote = SwapQuote(
            quote_id="quote-123",
            from_token="eth",
            to_token="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            price_ratio="2000.0",
            expires_at="2024-01-01T00:00:00Z",
        )
        assert quote.quote_id == "quote-123"
        assert quote.from_token == "eth"
        assert quote.to_token == "usdc"
        assert quote.from_amount == "1000000000000000000"
        assert quote.to_amount == "2000000000"
        assert quote.price_ratio == "2000.0"
        assert quote.expires_at == "2024-01-01T00:00:00Z"


class TestSwapResult:
    """Tests for SwapResult."""

    def test_swap_result_valid(self):
        """Test creating valid SwapResult."""
        result = SwapResult(
            transaction_hash="0xabc123",
            from_token="eth",
            to_token="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            quote_id="quote-123",
            network="base",
        )
        assert result.transaction_hash == "0xabc123"
        assert result.from_token == "eth"
        assert result.to_token == "usdc"
        assert result.from_amount == "1000000000000000000"
        assert result.to_amount == "2000000000"
        assert result.quote_id == "quote-123"
        assert result.network == "base"

    def test_swap_result_ethereum_network(self):
        """Test SwapResult with ethereum network."""
        result = SwapResult(
            transaction_hash="0xdef456",
            from_token="usdc",
            to_token="eth",
            from_amount="1000000",
            to_amount="500000000000000",
            quote_id="quote-456",
            network="ethereum",
        )
        assert result.network == "ethereum"


class TestCreateSwapResult:
    """Tests for CreateSwapResult."""

    def test_create_swap_result_valid(self):
        """Test creating valid CreateSwapResult."""
        result = CreateSwapResult(
            quote_id="quote-789",
            from_token="weth",
            to_token="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            to="0xSwapRouter",
            data="0xabcdef",
            value="0",
        )
        assert result.quote_id == "quote-789"
        assert result.from_token == "weth"
        assert result.to_token == "usdc"
        assert result.from_amount == "1000000000000000000"
        assert result.to_amount == "2000000000"
        assert result.to == "0xSwapRouter"
        assert result.data == "0xabcdef"
        assert result.value == "0"

    def test_create_swap_result_with_gas_params(self):
        """Test CreateSwapResult with gas parameters."""
        result = CreateSwapResult(
            quote_id="quote-999",
            from_token="eth",
            to_token="usdc",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            to="0xSwapRouter",
            data="0x123456",
            value="1000000000000000000",
            gas_limit=300000,
            max_fee_per_gas="50000000000",
            max_priority_fee_per_gas="2000000000",
        )
        assert result.gas_limit == 300000
        assert result.max_fee_per_gas == "50000000000"
        assert result.max_priority_fee_per_gas == "2000000000"
