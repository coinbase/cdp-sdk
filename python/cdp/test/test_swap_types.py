"""Unit tests for swap types."""

import pytest

from cdp.actions.evm.swap.types import (
    CreateSwapOptions,
    CreateSwapResult,
    SwapOptions,
    SwapQuote,
    SwapResult,
    SwapTransaction,
)


class TestCreateSwapOptions:
    """Test CreateSwapOptions."""

    def test_create_swap_options_basic(self):
        """Test basic CreateSwapOptions creation."""
        options = CreateSwapOptions(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            amount="1000000000000000000",
            network="base",
        )
        assert options.from_token == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"  # lowercase
        assert options.to_token == "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"  # lowercase
        assert options.amount == "1000000000000000000"
        assert options.network == "base"
        assert options.slippage_percentage == 0.5  # default

    def test_create_swap_options_with_slippage(self):
        """Test CreateSwapOptions with custom slippage."""
        options = CreateSwapOptions(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            amount="1000000",
            network="ethereum",
            slippage_percentage=1.0,
        )
        assert options.slippage_percentage == 1.0

    def test_create_swap_options_invalid_slippage(self):
        """Test CreateSwapOptions with invalid slippage."""
        with pytest.raises(ValueError, match="Slippage percentage must be between 0 and 100"):
            CreateSwapOptions(
                from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                amount="1000",
                network="base",
                slippage_percentage=101,
            )

    def test_create_swap_options_invalid_network(self):
        """Test CreateSwapOptions with unsupported network."""
        with pytest.raises(ValueError, match="Network must be one of"):
            CreateSwapOptions(
                from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                amount="1000",
                network="polygon",  # not supported
            )

    def test_create_swap_options_amount_as_int(self):
        """Test CreateSwapOptions with amount as int."""
        options = CreateSwapOptions(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            amount=1000000000000000000,
            network="base",
        )
        assert options.amount == "1000000000000000000"

    def test_create_swap_options_invalid_token_address(self):
        """Test CreateSwapOptions with invalid token address."""
        # Too short address
        with pytest.raises(ValueError, match="Token address must be a valid Ethereum address"):
            CreateSwapOptions(
                from_token="0x123",  # Too short
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                amount="1000",
                network="base",
            )

        # Not hex format
        with pytest.raises(ValueError, match="Token address must be a valid Ethereum address"):
            CreateSwapOptions(
                from_token="not-an-address",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                amount="1000",
                network="base",
            )


class TestSwapOptions:
    """Test SwapOptions."""

    def test_swap_options_with_create_swap_options(self):
        """Test SwapOptions with CreateSwapOptions."""
        create_options = CreateSwapOptions(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            amount="1000000000000000000",
            network="base",
        )
        options = SwapOptions(create_swap_options=create_options)
        assert options.create_swap_options == create_options
        assert options.create_swap_result is None

    def test_swap_options_with_create_swap_result(self):
        """Test SwapOptions with CreateSwapResult."""
        result = CreateSwapResult(
            quote_id="test-quote",
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            to="0x1234567890123456789012345678901234567890",
            data="0xabcdef",
            value="0",
        )
        options = SwapOptions(create_swap_result=result)
        assert options.create_swap_result == result
        assert options.create_swap_options is None

    def test_swap_options_mutually_exclusive(self):
        """Test that SwapOptions enforces mutual exclusivity."""
        create_options = CreateSwapOptions(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            amount="1000",
            network="base",
        )
        result = CreateSwapResult(
            quote_id="test-quote",
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            from_amount="1000",
            to_amount="2000",
            to="0x1234567890123456789012345678901234567890",
            data="0xabcdef",
            value="0",
        )

        with pytest.raises(
            ValueError,
            match="Only one of create_swap_options or create_swap_result can be provided",
        ):
            SwapOptions(create_swap_options=create_options, create_swap_result=result)

    def test_swap_options_requires_one(self):
        """Test that SwapOptions requires at least one option."""
        with pytest.raises(
            ValueError, match="Either create_swap_options or create_swap_result must be provided"
        ):
            SwapOptions()


class TestSwapResult:
    """Test SwapResult."""

    def test_swap_result_creation(self):
        """Test SwapResult creation."""
        result = SwapResult(
            transaction_hash="0xabc123",
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            quote_id="test-quote",
            network="base",
        )
        assert result.transaction_hash == "0xabc123"
        assert result.from_token == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        assert result.to_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert result.from_amount == "1000000000000000000"
        assert result.to_amount == "2000000000"
        assert result.quote_id == "test-quote"
        assert result.network == "base"


class TestSwapQuote:
    """Test SwapQuote."""

    def test_swap_quote_creation(self):
        """Test SwapQuote creation."""
        quote = SwapQuote(
            quote_id="test-quote-123",
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            from_amount="1000000000000000000",
            to_amount="2000000000",
            price_ratio="2000",
            expires_at="2024-01-01T00:00:00Z",
        )
        assert quote.quote_id == "test-quote-123"
        assert quote.from_token == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        assert quote.to_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert quote.from_amount == "1000000000000000000"
        assert quote.to_amount == "2000000000"
        assert quote.price_ratio == "2000"
        assert quote.expires_at == "2024-01-01T00:00:00Z"


class TestSwapTransaction:
    """Test SwapTransaction."""

    def test_swap_transaction_basic(self):
        """Test basic SwapTransaction."""
        tx = SwapTransaction(
            to="0x1234567890123456789012345678901234567890",
            data="0xabcdef",
            value=0,
        )
        assert tx.to == "0x1234567890123456789012345678901234567890"
        assert tx.data == "0xabcdef"
        assert tx.value == 0
        assert tx.transaction is None
        assert tx.permit2_data is None
        assert tx.requires_signature is False
