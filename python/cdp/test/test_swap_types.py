"""Comprehensive tests for swap types."""

import pytest

from cdp.actions.evm.swap.types import (
    AccountSwapOptions,
    AccountSwapResult,
    ExecuteSwapQuoteResult,
    InlineSendSwapTransactionOptions,
    QuoteBasedSendSwapTransactionOptions,
    QuoteSwapResult,
    SmartAccountSwapOptions,
    SmartAccountSwapResult,
    SwapParams,
    SwapPriceResult,
    SwapResult,
    SwapUnavailableResult,
)


class TestSwapParams:
    """Test SwapParams."""

    def test_swap_params_basic(self):
        """Test basic SwapParams creation."""
        params = SwapParams(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            from_amount="1000000000000000000",
            network="base",
        )
        assert params.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # preserved case
        assert params.to_token == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"  # preserved case
        assert params.from_amount == "1000000000000000000"
        assert params.network == "base"
        assert params.slippage_bps == 100  # default (1%)

    def test_swap_params_with_slippage(self):
        """Test SwapParams with custom slippage."""
        params = SwapParams(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            from_amount="1000000",
            network="ethereum",
            slippage_bps=200,  # 2%
        )
        assert params.slippage_bps == 200

    def test_swap_params_invalid_slippage(self):
        """Test SwapParams with invalid slippage."""
        with pytest.raises(ValueError, match="Slippage basis points must be between 0 and 10000"):
            SwapParams(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                from_amount="1000",
                network="base",
                slippage_bps=10001,  # > 100%
            )

    def test_swap_params_invalid_network(self):
        """Test SwapParams with unsupported network."""
        with pytest.raises(ValueError, match="Network must be one of"):
            SwapParams(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                from_amount="1000",
                network="polygon",  # not supported
            )

    def test_swap_params_amount_as_int(self):
        """Test SwapParams with amount as int."""
        params = SwapParams(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            from_amount=1000000000000000000,
            network="base",
        )
        assert params.from_amount == "1000000000000000000"

    def test_swap_params_invalid_token_address(self):
        """Test SwapParams with invalid token address."""
        from pydantic import ValidationError

        # Too short address
        with pytest.raises(ValidationError) as exc_info:
            SwapParams(
                from_token="0x123",  # Too short
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                from_amount="1000",
                network="base",
            )
        assert "Address must be a valid Ethereum address" in str(exc_info.value)

        # Not hex format
        with pytest.raises(ValidationError) as exc_info:
            SwapParams(
                from_token="not-an-address",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                from_amount="1000",
                network="base",
            )
        assert "Address must be a valid Ethereum address" in str(exc_info.value)


class TestSwapUnavailableResult:
    """Test SwapUnavailableResult."""

    def test_swap_unavailable_result(self):
        """Test SwapUnavailableResult creation."""
        result = SwapUnavailableResult()
        assert result.liquidity_available is False

        # Should always be False even if explicitly set
        result = SwapUnavailableResult(liquidity_available=False)
        assert result.liquidity_available is False


class TestQuoteSwapResult:
    """Test QuoteSwapResult."""

    def test_quote_swap_result_basic(self):
        """Test basic QuoteSwapResult creation."""
        result = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabcdef",
            value="0",
            network="base",
        )
        assert result.liquidity_available is True
        assert result.quote_id == "quote-123"
        assert result.requires_signature is False
        assert result.permit2_data is None

    def test_quote_swap_result_with_permit2(self):
        """Test QuoteSwapResult with Permit2 data."""
        permit2_data = {
            "eip712": {"domain": {}, "types": {}, "primaryType": "Test", "message": {}},
            "hash": "0x123",
        }
        result = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabcdef",
            value="0",
            network="base",
            permit2_data=permit2_data,
            requires_signature=True,
        )
        assert result.requires_signature is True
        assert result.permit2_data == permit2_data

    def test_quote_swap_result_gas_params(self):
        """Test QuoteSwapResult with gas parameters."""
        result = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabcdef",
            value="1000000000000000",  # 0.001 ETH
            network="base",
            gas_limit=200000,
            gas_price="20000000000",
            max_fee_per_gas="30000000000",
            max_priority_fee_per_gas="2000000000",
        )
        assert result.gas_limit == 200000
        assert result.gas_price == "20000000000"
        assert result.max_fee_per_gas == "30000000000"
        assert result.max_priority_fee_per_gas == "2000000000"

    @pytest.mark.asyncio
    async def test_quote_swap_result_execute_without_context(self):
        """Test QuoteSwapResult execute without proper context."""
        result = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabcdef",
            value="0",
            network="base",
        )

        with pytest.raises(ValueError, match="This swap quote cannot be executed directly"):
            await result.execute()


class TestAccountSwapOptions:
    """Test AccountSwapOptions."""

    def test_account_swap_options_with_quote(self):
        """Test AccountSwapOptions with swap quote."""
        quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabcdef",
            value="0",
            network="base",
        )
        options = AccountSwapOptions(swap_quote=quote)
        assert options.swap_quote == quote
        assert options.network is None
        assert options.from_token is None

    def test_account_swap_options_inline(self):
        """Test AccountSwapOptions with inline parameters."""
        options = AccountSwapOptions(
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            slippage_bps=150,
            idempotency_key="test-key",
        )
        assert options.network == "base"
        assert options.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert options.to_token == "0x4200000000000000000000000000000000000006"
        assert options.from_amount == "1000000"
        assert options.slippage_bps == 150
        assert options.idempotency_key == "test-key"
        assert options.swap_quote is None

    def test_account_swap_options_invalid_address(self):
        """Test AccountSwapOptions with invalid address."""
        with pytest.raises(ValueError, match="Invalid Ethereum address"):
            AccountSwapOptions(
                network="base",
                from_token="invalid-address",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
            )

    def test_account_swap_options_invalid_slippage(self):
        """Test AccountSwapOptions with invalid slippage."""
        with pytest.raises(ValueError, match="Slippage must be between 0 and 10000"):
            AccountSwapOptions(
                network="base",
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                slippage_bps=10001,
            )


class TestSmartAccountSwapOptions:
    """Test SmartAccountSwapOptions."""

    def test_smart_account_swap_options_with_quote(self):
        """Test SmartAccountSwapOptions with swap quote."""
        quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabcdef",
            value="0",
            network="base",
        )
        options = SmartAccountSwapOptions(
            swap_quote=quote,
            paymaster_url="https://paymaster.example.com",
        )
        assert options.swap_quote == quote
        assert options.paymaster_url == "https://paymaster.example.com"
        assert options.network is None

    def test_smart_account_swap_options_inline(self):
        """Test SmartAccountSwapOptions with inline parameters."""
        options = SmartAccountSwapOptions(
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            slippage_bps=150,
            paymaster_url="https://paymaster.example.com",
            idempotency_key="test-key",
        )
        assert options.network == "base"
        assert options.paymaster_url == "https://paymaster.example.com"
        assert options.slippage_bps == 150


class TestSwapPriceResult:
    """Test SwapPriceResult."""

    def test_swap_price_result_creation(self):
        """Test SwapPriceResult creation."""
        result = SwapPriceResult(
            quote_id="price-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            price_ratio="500",
            expires_at="2024-01-01T00:00:00Z",
        )
        assert result.quote_id == "price-123"
        assert result.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert result.to_amount == "500000000000000"
        assert result.price_ratio == "500"
        assert result.expires_at == "2024-01-01T00:00:00Z"


class TestSwapResult:
    """Test SwapResult."""

    def test_swap_result_creation(self):
        """Test SwapResult creation."""
        result = SwapResult(
            transaction_hash="0xabc123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            quote_id="quote-123",
            network="base",
        )
        assert result.transaction_hash == "0xabc123"
        assert result.quote_id == "quote-123"
        assert result.network == "base"


class TestAccountSwapResult:
    """Test AccountSwapResult."""

    def test_account_swap_result(self):
        """Test AccountSwapResult creation."""
        result = AccountSwapResult(transaction_hash="0xabc123def456")
        assert result.transaction_hash == "0xabc123def456"


class TestSmartAccountSwapResult:
    """Test SmartAccountSwapResult."""

    def test_smart_account_swap_result(self):
        """Test SmartAccountSwapResult creation."""
        result = SmartAccountSwapResult(
            user_op_hash="0xdef456abc789",
            smart_account_address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            status="pending",
        )
        assert result.user_op_hash == "0xdef456abc789"
        assert result.smart_account_address == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        assert result.status == "pending"


class TestExecuteSwapQuoteResult:
    """Test ExecuteSwapQuoteResult."""

    def test_execute_swap_quote_result_eoa(self):
        """Test ExecuteSwapQuoteResult for EOA swap."""
        result = ExecuteSwapQuoteResult(transaction_hash="0xabc123")
        assert result.transaction_hash == "0xabc123"
        assert result.user_op_hash is None
        assert result.smart_account_address is None
        assert result.status is None

    def test_execute_swap_quote_result_smart_account(self):
        """Test ExecuteSwapQuoteResult for smart account swap."""
        result = ExecuteSwapQuoteResult(
            user_op_hash="0xdef456",
            smart_account_address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            status="complete",
        )
        assert result.transaction_hash is None
        assert result.user_op_hash == "0xdef456"
        assert result.smart_account_address == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        assert result.status == "complete"


class TestSendSwapTransactionOptions:
    """Test SendSwapTransactionOptions types."""

    def test_inline_send_swap_transaction_options(self):
        """Test InlineSendSwapTransactionOptions."""
        options = InlineSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            slippage_bps=100,
        )
        assert options.address == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        assert options.network == "base"
        assert options.slippage_bps == 100

    def test_inline_options_invalid_network(self):
        """Test InlineSendSwapTransactionOptions with invalid network."""
        with pytest.raises(ValueError, match="Network must be one of"):
            InlineSendSwapTransactionOptions(
                address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
                network="polygon",  # Invalid
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            )

    def test_quote_based_send_swap_transaction_options(self):
        """Test QuoteBasedSendSwapTransactionOptions."""
        quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabcdef",
            value="0",
            network="base",
        )
        options = QuoteBasedSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            swap_quote=quote,
            idempotency_key="test-key",
        )
        assert options.address == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        assert options.swap_quote == quote
        assert options.idempotency_key == "test-key"

    def test_options_invalid_address(self):
        """Test options with invalid address."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            InlineSendSwapTransactionOptions(
                address="invalid",
                network="base",
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            )

        # Check that the error message contains the expected text
        assert "Address must be a valid Ethereum address" in str(exc_info.value)
