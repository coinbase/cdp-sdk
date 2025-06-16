"""Tests for EvmServerAccount swap methods."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

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

        # Mock the create_evm_swap_quote_without_preload_content response
        mock_swap_response = MagicMock()
        mock_swap_response_data = {
            "liquidityAvailable": True,
            "toAmount": "500000000000000",
            "minToAmount": "495000000000000",
            "blockNumber": "123456",
            "fromToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "toToken": "0x4200000000000000000000000000000000000006",
            "fromAmount": "1000000",
            "fees": {
                "gasFee": {
                    "amount": "1000000000000000",
                    "token": "0x0000000000000000000000000000000000000000",
                }
            },
            "issues": {"simulationIncomplete": False},
            "transaction": {
                "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                "data": "0xabc123def456",
                "value": "0",
                "gas": "200000",
                "gasPrice": "20000000000",
            },
        }
        mock_swap_response.read = AsyncMock(
            return_value=json.dumps(mock_swap_response_data).encode("utf-8")
        )
        api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_swap_response
        )

        api_clients.evm_accounts = MagicMock()

        # Mock the send_evm_transaction response to return an object with transaction_hash
        mock_response = MagicMock()
        mock_response.transaction_hash = "0xmocked_transaction_hash"
        api_clients.evm_accounts.send_evm_transaction = AsyncMock(return_value=mock_response)

        return api_clients

    @pytest.fixture
    def mock_evm_accounts_api(self):
        """Create mock EVM accounts API."""
        mock = MagicMock()

        # Mock the send_evm_transaction response to return an object with transaction_hash
        mock_response = MagicMock()
        mock_response.transaction_hash = "0xmocked_transaction_hash"
        mock.send_evm_transaction = AsyncMock(return_value=mock_response)

        return mock

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
            gas_limit=200000,
        )

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction")
    async def test_swap_with_quote(self, mock_send_swap, server_account, mock_api_clients):
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
            gas_limit=200000,
        )

        swap_options = AccountSwapOptions(
            swap_quote=mock_quote,
            idempotency_key="test-key",
        )

        mock_send_swap.return_value = AccountSwapResult(transaction_hash="0xtxhash123")

        result = await server_account.swap(swap_options)

        assert isinstance(result, AccountSwapResult)
        assert result.transaction_hash == "0xmocked_transaction_hash"

        # In Python 3.10, the patch doesn't work correctly with local imports
        # So we just verify the result instead of checking mock calls

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction")
    async def test_swap_inline(self, mock_send_swap, server_account, mock_api_clients):
        """Test swap method with inline parameters."""
        swap_options = AccountSwapOptions(
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            slippage_bps=150,
            idempotency_key="test-key",
        )

        mock_send_swap.return_value = AccountSwapResult(transaction_hash="0xtxhash456")

        result = await server_account.swap(swap_options)

        # Real function is called, so we get the mocked API response
        assert result.transaction_hash == "0xmocked_transaction_hash"

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.create_swap_quote")
    async def test_quote_swap(self, mock_create_quote, server_account, mock_api_clients):
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
            gas_limit=200000,
        )

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
        # Quote ID is generated by SDK, not returned from API
        assert len(result.quote_id) == 16  # Should be 16-character hash
        assert result.from_amount == "1000000"
        assert result.to_amount == "500000000000000"

    @pytest.mark.asyncio
    async def test_quote_swap_no_liquidity(self, server_account, mock_api_clients):
        """Test quote_swap when no liquidity is available."""
        # Override the mock response to indicate no liquidity
        mock_swap_response = MagicMock()
        mock_swap_response_data = {
            "liquidityAvailable": False,
        }
        mock_swap_response.read = AsyncMock(
            return_value=json.dumps(mock_swap_response_data).encode("utf-8")
        )
        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_swap_response
        )

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
        result = await server_account.quote_swap(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            # No slippage_bps specified
        )

        # Just verify we got a valid quote
        assert isinstance(result, QuoteSwapResult)
        assert result.liquidity_available is True

    @pytest.mark.asyncio
    @patch("cdp.actions.evm.swap.send_swap_transaction")
    @patch("cdp.actions.evm.swap.create_swap_quote")
    async def test_swap_quote_then_execute(
        self, mock_create_quote, mock_send_swap, server_account, mock_api_clients
    ):
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
            gas_limit=200000,
        )

        # Step 1: Set up mock for quote creation
        mock_create_quote.return_value = mock_quote

        quote = await server_account.quote_swap(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
        )

        # Step 2: Set up mock for swap execution
        mock_send_swap.return_value = AccountSwapResult(transaction_hash="0xexecuted123")

        result = await server_account.swap(AccountSwapOptions(swap_quote=quote))

        # Real function is called, so we get the mocked API response
        assert result.transaction_hash == "0xmocked_transaction_hash"
