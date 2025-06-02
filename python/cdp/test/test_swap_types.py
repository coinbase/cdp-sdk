"""Unit tests for swap types."""

import pytest

from cdp.actions.evm.swap.types import (
    SwapOptions,
    SwapParams,
    SwapQuote,
    SwapQuoteResult,
    SwapResult,
    SwapTransaction,
)


class TestSwapParams:
    """Test SwapParams."""

    def test_swap_params_basic(self):
        """Test basic SwapParams creation."""
        params = SwapParams(
            buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            sell_amount="1000000000000000000",
            network="base",
        )
        assert params.buy_token == "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"  # lowercase
        assert params.sell_token == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"  # lowercase
        assert params.sell_amount == "1000000000000000000"
        assert params.network == "base"
        assert params.slippage_bps == 100  # default (1%)

    def test_swap_params_with_slippage(self):
        """Test SwapParams with custom slippage."""
        params = SwapParams(
            buy_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            sell_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            sell_amount="1000000",
            network="ethereum",
            slippage_bps=200,  # 2%
        )
        assert params.slippage_bps == 200

    def test_swap_params_invalid_slippage(self):
        """Test SwapParams with invalid slippage."""
        with pytest.raises(ValueError, match="Slippage basis points must be between 0 and 10000"):
            SwapParams(
                buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                sell_amount="1000",
                network="base",
                slippage_bps=10001,  # > 100%
            )

    def test_swap_params_invalid_network(self):
        """Test SwapParams with unsupported network."""
        with pytest.raises(ValueError, match="Network must be one of"):
            SwapParams(
                buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                sell_amount="1000",
                network="polygon",  # not supported
            )

    def test_swap_params_amount_as_int(self):
        """Test SwapParams with amount as int."""
        params = SwapParams(
            buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            sell_amount=1000000000000000000,
            network="base",
        )
        assert params.sell_amount == "1000000000000000000"

    def test_swap_params_invalid_token_address(self):
        """Test SwapParams with invalid token address."""
        # Too short address
        with pytest.raises(ValueError, match="Token address must be a valid Ethereum address"):
            SwapParams(
                buy_token="0x123",  # Too short
                sell_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                sell_amount="1000",
                network="base",
            )

        # Not hex format
        with pytest.raises(ValueError, match="Token address must be a valid Ethereum address"):
            SwapParams(
                buy_token="not-an-address",
                sell_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                sell_amount="1000",
                network="base",
            )


class TestSwapOptions:
    """Test SwapOptions."""

    def test_swap_options_with_params(self):
        """Test SwapOptions with SwapParams."""
        params = SwapParams(
            buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            sell_amount="1000000000000000000",
            network="base",
        )
        options = SwapOptions(swap_params=params)
        assert options.swap_params == params
        assert options.swapQuote is None

    def test_swap_options_with_quote_result(self):
        """Test SwapOptions with SwapQuoteResult."""
        quote = SwapQuoteResult(
            quote_id="quote-123",
            buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            buy_amount="2000000000",
            sell_amount="1000000000000000000",
            min_buy_amount="1900000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0x1234abcd",
            value="0",
            network="base",
        )
        options = SwapOptions(swapQuote=quote)
        assert options.swapQuote == quote
        assert options.swap_params is None

    def test_swap_options_backward_compatibility(self):
        """Test SwapOptions backward compatibility with swap_quote_result."""
        quote = SwapQuoteResult(
            quote_id="quote-123",
            buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            buy_amount="2000000000",
            sell_amount="1000000000000000000",
            min_buy_amount="1900000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0x1234abcd",
            value="0",
            network="base",
        )
        # Should still work with old parameter name
        options = SwapOptions(swap_quote_result=quote)
        assert options.swapQuote == quote
        assert options.swap_params is None

    def test_swap_options_no_options(self):
        """Test SwapOptions with no options."""
        with pytest.raises(ValueError, match="One of swap_params or swapQuote must be provided"):
            SwapOptions()

    def test_swap_options_multiple_options(self):
        """Test SwapOptions with multiple options."""
        params = SwapParams(
            buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            sell_amount="1000000000000000000",
            network="base",
        )
        quote = SwapQuoteResult(
            quote_id="quote-123",
            buy_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            sell_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            buy_amount="2000000000",
            sell_amount="1000000000000000000",
            min_buy_amount="1900000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0x1234abcd",
            value="0",
            network="base",
        )
        with pytest.raises(
            ValueError, match="Only one of swap_params or swapQuote can be provided"
        ):
            SwapOptions(swap_params=params, swapQuote=quote)


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
