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
            gas_limit=200000,
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
    @patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction")
    async def test_send_swap_transaction_quote_based(self, mock_send_tx, mock_api_clients, mock_swap_quote):
        """Test send_swap_transaction with pre-created quote."""
        options = QuoteBasedSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            swap_quote=mock_swap_quote,
        )

        mock_send_tx.return_value = "0xtxhash123"

        result = await send_swap_transaction(
            api_clients=mock_api_clients,
            options=options,
        )

        assert isinstance(result, AccountSwapResult)
        assert result.transaction_hash == "0xtxhash123"

        # Verify send_transaction was called correctly
        mock_send_tx.assert_called_once()
        call_args = mock_send_tx.call_args
        assert (
            call_args.kwargs["address"] == "0x742d35cc6634C0532925A3b844bC9E7595F12345"
        )  # Checksummed
        assert call_args.kwargs["network"] == "base"

        # Check transaction request
        tx_request = call_args.kwargs["transaction"]
        assert tx_request.to == "0xDef1C0ded9bec7F1a1670819833240f027b25EfF"  # Checksummed
        assert tx_request.data == "0xabc123def456"
        assert tx_request.value == 0
        assert tx_request.gas == 200000

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction")
    @patch("cdp.actions.evm.swap.send_swap_transaction.create_swap_quote")
    async def test_send_swap_transaction_inline(self, mock_create_quote, mock_send_tx, mock_api_clients):
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
            gas_limit=200000,
        )

        mock_create_quote.return_value = mock_quote
        mock_send_tx.return_value = "0xtxhash456"

        result = await send_swap_transaction(
            api_clients=mock_api_clients,
            options=options,
        )

        assert result.transaction_hash == "0xtxhash456"

        # Verify create_swap_quote was called
        mock_create_quote.assert_called_once()
        create_quote_args = mock_create_quote.call_args
        assert create_quote_args.kwargs["from_token"] == options.from_token
        assert create_quote_args.kwargs["to_token"] == options.to_token
        assert create_quote_args.kwargs["from_amount"] == options.from_amount
        assert create_quote_args.kwargs["slippage_bps"] == 150

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction.create_swap_quote")
    async def test_send_swap_transaction_inline_no_liquidity(self, mock_create_quote, mock_api_clients):
        """Test send_swap_transaction when no liquidity is available."""
        options = InlineSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        mock_create_quote.return_value = SwapUnavailableResult(liquidity_available=False)

        with pytest.raises(ValueError, match="Swap unavailable: Insufficient liquidity"):
            await send_swap_transaction(
                api_clients=mock_api_clients,
                options=options,
            )

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction")
    async def test_send_swap_transaction_with_permit2(
        self, mock_send_tx, mock_api_clients, mock_swap_quote_with_permit2
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

        mock_send_tx.return_value = "0xtxhash789"

        result = await send_swap_transaction(
            api_clients=mock_api_clients,
            options=options,
        )

        assert result.transaction_hash == "0xtxhash789"

        # Verify Permit2 signature was requested
        mock_api_clients.evm_accounts.sign_evm_typed_data.assert_called_once()

        # Verify transaction data includes Permit2 signature
        call_args = mock_send_tx.call_args
        tx_request = call_args.kwargs["transaction"]
        # Should have original data + length (64 hex chars) + signature (without 0x)
        expected_data = (
            "0xabc123def456"
            + "0000000000000000000000000000000000000000000000000000000000000008"
            + "1234567890abcdef"
        )
        assert tx_request.data == expected_data

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction")
    async def test_send_swap_transaction_with_idempotency_key(
        self, mock_send_tx, mock_api_clients, mock_swap_quote
    ):
        """Test send_swap_transaction with idempotency key."""
        options = QuoteBasedSendSwapTransactionOptions(
            address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            swap_quote=mock_swap_quote,
            idempotency_key="base-key",
        )

        mock_send_tx.return_value = "0xtxhash123"

        _ = await send_swap_transaction(
            api_clients=mock_api_clients,
            options=options,
        )

        # Verify idempotency key was passed to send_transaction
        call_args = mock_send_tx.call_args
        assert call_args.kwargs["idempotency_key"] == "base-key"

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction")
    @patch("cdp.actions.evm.swap.send_swap_transaction.create_swap_quote")
    async def test_send_swap_transaction_inline_with_idempotency_key(self, mock_create_quote, mock_send_tx, mock_api_clients):
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
            gas_limit=200000,
        )

        mock_create_quote.return_value = mock_quote
        mock_send_tx.return_value = "0xtxhash456"

        _ = await send_swap_transaction(
            api_clients=mock_api_clients,
            options=options,
        )

        # Verify deterministic quote idempotency key was generated
        create_quote_args = mock_create_quote.call_args
        quote_key = create_quote_args.kwargs["idempotency_key"]
        assert quote_key is not None
        assert quote_key != "base-key"  # Should be deterministic variant

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction.send_transaction")
    async def test_send_swap_transaction_with_gas_params(self, mock_send_tx, mock_api_clients):
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

        mock_send_tx.return_value = "0xtxhash123"

        _ = await send_swap_transaction(
            api_clients=mock_api_clients,
            options=options,
        )

        # Verify gas parameters were set
        call_args = mock_send_tx.call_args
        tx_request = call_args.kwargs["transaction"]
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
