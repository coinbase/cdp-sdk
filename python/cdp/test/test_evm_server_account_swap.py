"""Tests for EvmServerAccount swap methods."""

from unittest.mock import MagicMock, patch

import pytest

from cdp.actions.evm.swap.types import (
    AccountSwapOptions,
    AccountSwapResult,
    QuoteSwapResult,
    SwapUnavailableResult,
)
from cdp.evm_server_account import EvmServerAccount


class TestEvmServerAccountSwap:
    """Test swap methods for EvmServerAccount."""

    @pytest.fixture
    def mock_api_clients(self):
        """Create mock API clients."""
        api_clients = MagicMock()
        api_clients.evm_swaps = MagicMock()
        api_clients.evm_accounts = MagicMock()
        return api_clients

    @pytest.fixture
    def mock_evm_accounts_api(self):
        """Create mock EVM accounts API."""
        return MagicMock()

    @pytest.fixture
    def mock_server_account_model(self):
        """Create mock server account model."""
        model = MagicMock()
        model.address = "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        model.name = "TestAccount"
        model.policies = []
        return model

    @pytest.fixture
    def server_account(self, mock_server_account_model, mock_evm_accounts_api, mock_api_clients):
        """Create EvmServerAccount instance."""
        return EvmServerAccount(
            evm_server_account_model=mock_server_account_model,
            evm_accounts_api=mock_evm_accounts_api,
            api_clients=mock_api_clients,
        )

    @pytest.fixture
    def mock_quote(self):
        """Create a mock swap quote."""
        return QuoteSwapResult(
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
        )

    @pytest.mark.asyncio
    async def test_swap_with_quote(self, server_account, mock_api_clients):
        """Test swap method with pre-created quote."""
        mock_quote = QuoteSwapResult(
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
        )

        swap_options = AccountSwapOptions(
            swap_quote=mock_quote,
            idempotency_key="test-key",
        )

        with patch(
            "cdp.actions.evm.swap.send_swap_transaction.send_swap_transaction"
        ) as mock_send_swap:
            mock_send_swap.return_value = AccountSwapResult(transaction_hash="0xtxhash123")

            result = await server_account.swap(swap_options)

            assert isinstance(result, AccountSwapResult)
            assert result.transaction_hash == "0xtxhash123"

            # Verify send_swap_transaction was called
            mock_send_swap.assert_called_once()
            call_args = mock_send_swap.call_args
            assert call_args.kwargs["api_clients"] == mock_api_clients

            # Check options
            options = call_args.kwargs["options"]
            assert options.address == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
            assert options.swap_quote == mock_quote
            assert options.idempotency_key == "test-key"

    @pytest.mark.asyncio
    async def test_swap_inline(self, server_account, mock_api_clients):
        """Test swap method with inline parameters."""
        swap_options = AccountSwapOptions(
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            slippage_bps=150,
            idempotency_key="test-key",
        )

        with patch(
            "cdp.actions.evm.swap.send_swap_transaction.send_swap_transaction"
        ) as mock_send_swap:
            mock_send_swap.return_value = AccountSwapResult(transaction_hash="0xtxhash456")

            result = await server_account.swap(swap_options)

            assert result.transaction_hash == "0xtxhash456"

            # Verify inline options were passed correctly
            call_args = mock_send_swap.call_args
            options = call_args.kwargs["options"]
            assert options.address == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
            assert options.network == "base"
            assert options.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
            assert options.to_token == "0x4200000000000000000000000000000000000006"
            assert options.from_amount == "1000000"
            assert options.taker == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"  # Same as address
            assert options.slippage_bps == 150

    @pytest.mark.asyncio
    async def test_quote_swap(self, server_account, mock_api_clients):
        """Test quote_swap method."""
        mock_quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-789",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="0",
            network="base",
        )

        with patch("cdp.actions.evm.swap.create_swap_quote.create_swap_quote") as mock_create_quote:
            mock_create_quote.return_value = mock_quote

            result = await server_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
                slippage_bps=200,
                idempotency_key="quote-key",
            )

            assert isinstance(result, QuoteSwapResult)
            assert result.quote_id == "quote-789"
            assert result.from_amount == "1000000"
            assert result.to_amount == "500000000000000"

            # Verify create_swap_quote was called correctly
            mock_create_quote.assert_called_once()
            call_args = mock_create_quote.call_args
            assert call_args.kwargs["api_clients"] == mock_api_clients
            assert call_args.kwargs["from_token"] == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
            assert call_args.kwargs["to_token"] == "0x4200000000000000000000000000000000000006"
            assert call_args.kwargs["from_amount"] == "1000000"
            assert call_args.kwargs["network"] == "base"
            assert call_args.kwargs["taker"] == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
            assert call_args.kwargs["slippage_bps"] == 200
            assert call_args.kwargs["signer_address"] is None  # Not used for regular accounts
            assert call_args.kwargs["idempotency_key"] == "quote-key"

    @pytest.mark.asyncio
    async def test_quote_swap_no_liquidity(self, server_account, mock_api_clients):
        """Test quote_swap when no liquidity is available."""
        with patch("cdp.actions.evm.swap.create_swap_quote.create_swap_quote") as mock_create_quote:
            mock_create_quote.return_value = SwapUnavailableResult(liquidity_available=False)

            result = await server_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000000000",  # Large amount
                network="base",
            )

            assert isinstance(result, SwapUnavailableResult)
            assert result.liquidity_available is False

    @pytest.mark.asyncio
    async def test_quote_swap_default_slippage(self, server_account, mock_api_clients):
        """Test quote_swap with default slippage."""
        mock_quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-default",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="0",
            network="base",
        )

        with patch("cdp.actions.evm.swap.create_swap_quote.create_swap_quote") as mock_create_quote:
            mock_create_quote.return_value = mock_quote

            _ = await server_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
                # No slippage_bps specified
            )

            # Verify default slippage was passed
            call_args = mock_create_quote.call_args
            assert (
                call_args.kwargs["slippage_bps"] is None
            )  # Will default to 100 in create_swap_quote

    @pytest.mark.asyncio
    async def test_swap_quote_then_execute(self, server_account, mock_api_clients):
        """Test getting a quote and then executing it."""
        mock_quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-exec",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            to_amount="500000000000000",
            min_to_amount="495000000000000",
            to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            data="0xabc123def456",
            value="0",
            network="base",
        )

        # Step 1: Get quote
        with patch("cdp.actions.evm.swap.create_swap_quote.create_swap_quote") as mock_create_quote:
            mock_create_quote.return_value = mock_quote

            quote = await server_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
            )

        # Step 2: Execute quote
        with patch(
            "cdp.actions.evm.swap.send_swap_transaction.send_swap_transaction"
        ) as mock_send_swap:
            mock_send_swap.return_value = AccountSwapResult(transaction_hash="0xexecuted123")

            result = await server_account.swap(AccountSwapOptions(swap_quote=quote))

            assert result.transaction_hash == "0xexecuted123"

            # Verify the quote was passed correctly
            call_args = mock_send_swap.call_args
            options = call_args.kwargs["options"]
            assert options.swap_quote == quote
