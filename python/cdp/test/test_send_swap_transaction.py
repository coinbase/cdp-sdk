"""Tests for send_swap_transaction functionality."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.swap.send_swap_transaction import send_swap_transaction
from cdp.actions.evm.swap.types import (
    AccountSwapResult,
    InlineSendSwapTransactionOptions,
    Permit2Data,
    QuoteBasedSendSwapTransactionOptions,
    QuoteSwapResult,
    SwapUnavailableResult,
)


class TestSendSwapTransaction:
    """Test send_swap_transaction function."""

    @pytest.fixture
    def mock_api_clients(self):
        """Create mock API clients."""
        api_clients = MagicMock()
        api_clients.evm_swaps = MagicMock()
        api_clients.evm_accounts = MagicMock()

        # Mock the send_evm_transaction to return an async mock
        mock_send_response = MagicMock()
        mock_send_response.transaction_hash = "0xdefault_tx_hash"
        api_clients.evm_accounts.send_evm_transaction = AsyncMock(return_value=mock_send_response)

        return api_clients

    @pytest.fixture
    def mock_swap_quote(self):
        """Create a mock swap quote."""
        quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="0",
            network="base",
            gas_limit=200000,
        )
        return quote

    @pytest.fixture
    def mock_swap_quote_with_permit2(self):
        """Create a mock swap quote that requires Permit2."""
        quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="0",
            network="base",
            gas_limit=200000,  # Add gas_limit
            requires_signature=True,
            permit2_data=Permit2Data(
                eip712={
                    "domain": {
                        "name": "Permit2",
                        "chainId": 8453,
                        "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3",
                    },
                    "types": {},
                    "primaryType": "PermitTransferFrom",
                    "message": {},
                },
                hash="0x12345",
            ),
        )
        return quote

    @pytest.mark.asyncio
    async def test_send_swap_transaction_quote_based(self, mock_api_clients, mock_swap_quote):
        """Test send_swap_transaction with pre-created quote."""
        options = QuoteBasedSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            swap_quote=mock_swap_quote,
        )

        # Mock send_transaction - make it an async function
        async def mock_send_tx_func(*args, **kwargs):
            return "0xtxhash123"
            
        with patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction", new=mock_send_tx_func):
            result = await send_swap_transaction(
                api_clients=mock_api_clients,
                options=options,
            )

            assert isinstance(result, AccountSwapResult)
            assert result.transaction_hash == "0xtxhash123"

            # No need to verify call args since we're using a simple mock function

    @pytest.mark.asyncio
    async def test_send_swap_transaction_inline(self, mock_api_clients):
        """Test send_swap_transaction with inline parameters."""
        options = InlineSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            slippage_bps=150,
        )

        # Mock create_swap_quote response
        mock_quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token=options.from_token,
            to_token=options.to_token,
            from_amount=options.from_amount,
            to_amount="500000000000000",
            min_to_amount="490000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="0",
            network="base",
            gas_limit=200000,  # Add gas_limit
        )

        async def mock_create_quote_func(*args, **kwargs):
            return mock_quote
            
        async def mock_send_tx_func(*args, **kwargs):
            return "0xtxhash456"

        with patch(
            "cdp.actions.evm.swap.send_swap_transaction.create_swap_quote",
            new=mock_create_quote_func
        ):
            with patch(
                "cdp.actions.evm.swap.send_swap_transaction.send_transaction",
                new=mock_send_tx_func
            ):
                result = await send_swap_transaction(
                    api_clients=mock_api_clients,
                    options=options,
                )

                assert result.transaction_hash == "0xtxhash456"

    @pytest.mark.asyncio
    async def test_send_swap_transaction_inline_no_liquidity(self, mock_api_clients):
        """Test send_swap_transaction when no liquidity is available."""
        options = InlineSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        async def mock_create_quote_func(*args, **kwargs):
            return SwapUnavailableResult(liquidity_available=False)

        with patch(
            "cdp.actions.evm.swap.send_swap_transaction.create_swap_quote",
            new=mock_create_quote_func
        ):
            with pytest.raises(ValueError, match="Swap unavailable: Insufficient liquidity"):
                await send_swap_transaction(
                    api_clients=mock_api_clients,
                    options=options,
                )

    @pytest.mark.asyncio
    async def test_send_swap_transaction_with_permit2(
        self, mock_api_clients, mock_swap_quote_with_permit2
    ):
        """Test send_swap_transaction with Permit2 signature required."""
        options = QuoteBasedSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            swap_quote=mock_swap_quote_with_permit2,
        )

        # Mock Permit2 signature
        mock_api_clients.evm_accounts.sign_evm_typed_data = AsyncMock(
            return_value=MagicMock(signature="0x1234567890abcdef")
        )

        async def mock_send_tx_func(*args, **kwargs):
            return "0xtxhash789"
            
        with patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction", new=mock_send_tx_func):
            result = await send_swap_transaction(
                api_clients=mock_api_clients,
                options=options,
            )

            assert result.transaction_hash == "0xtxhash789"

            # Verify Permit2 signature was requested
            mock_api_clients.evm_accounts.sign_evm_typed_data.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_swap_transaction_with_idempotency_key(
        self, mock_api_clients, mock_swap_quote
    ):
        """Test send_swap_transaction with idempotency key."""
        options = QuoteBasedSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            swap_quote=mock_swap_quote,
            idempotency_key="base-key",
        )

        captured_kwargs = {}
        
        async def mock_send_tx_func(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return "0xtxhash123"
            
        with patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction", new=mock_send_tx_func):
            _ = await send_swap_transaction(
                api_clients=mock_api_clients,
                options=options,
            )

            # Verify idempotency key was passed to send_transaction
            assert captured_kwargs["idempotency_key"] == "base-key"

    @pytest.mark.asyncio
    async def test_send_swap_transaction_inline_with_idempotency_key(self, mock_api_clients):
        """Test inline swap with deterministic idempotency keys."""
        options = InlineSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            idempotency_key="base-key",
        )

        mock_quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token=options.from_token,
            to_token=options.to_token,
            from_amount=options.from_amount,
            to_amount="500000000000000",
            min_to_amount="490000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="0",
            network="base",
            gas_limit=200000,  # Add gas_limit
        )

        captured_create_quote_kwargs = {}
        
        async def mock_create_quote_func(*args, **kwargs):
            captured_create_quote_kwargs.update(kwargs)
            return mock_quote
            
        async def mock_send_tx_func(*args, **kwargs):
            return "0xtxhash456"

        with patch(
            "cdp.actions.evm.swap.send_swap_transaction.create_swap_quote",
            new=mock_create_quote_func
        ):
            with patch(
                "cdp.actions.evm.swap.send_swap_transaction.send_transaction",
                new=mock_send_tx_func
            ):
                _ = await send_swap_transaction(
                    api_clients=mock_api_clients,
                    options=options,
                )

                # Verify deterministic quote idempotency key was generated
                quote_key = captured_create_quote_kwargs["idempotency_key"]
                assert quote_key is not None
                assert quote_key != "base-key"  # Should be deterministic variant

    @pytest.mark.asyncio
    async def test_send_swap_transaction_with_gas_params(self, mock_api_clients):
        """Test send_swap_transaction with gas parameters."""
        quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-123",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="1000000000000000",  # 0.001 ETH
            network="base",
            gas_limit=250000,
            max_fee_per_gas="30000000000",
            max_priority_fee_per_gas="2000000000",
        )

        options = QuoteBasedSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            swap_quote=quote,
        )

        captured_args = {}
        
        async def mock_send_tx_func(*args, **kwargs):
            captured_args.update(kwargs)
            return "0xtxhash123"
            
        with patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction", new=mock_send_tx_func):
            _ = await send_swap_transaction(
                api_clients=mock_api_clients,
                options=options,
            )

            # Verify gas parameters were set
            tx_request = captured_args["transaction"]
            assert tx_request.value == 1000000000000000
            assert tx_request.gas == 250000
            assert tx_request.maxFeePerGas == 30000000000
            assert tx_request.maxPriorityFeePerGas == 2000000000

    @pytest.mark.asyncio
    async def test_send_swap_transaction_invalid_options(self, mock_api_clients):
        """Test send_swap_transaction with invalid options type."""
        invalid_options = MagicMock()  # Not a valid options type

        with pytest.raises(ValueError, match="Invalid options type"):
            await send_swap_transaction(
                api_clients=mock_api_clients,
                options=invalid_options,
            )
