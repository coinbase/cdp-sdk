"""Tests for EvmSmartAccount swap methods."""

from unittest.mock import MagicMock, patch

import pytest

from cdp.actions.evm.swap.types import (
    QuoteSwapResult,
    SmartAccountSwapOptions,
    SmartAccountSwapResult,
    SwapUnavailableResult,
)
from cdp.evm_smart_account import EvmSmartAccount


class TestEvmSmartAccountSwap:
    """Test swap methods for EvmSmartAccount."""

    @pytest.fixture
    def mock_api_clients(self):
        """Create mock API clients."""
        api_clients = MagicMock()
        api_clients.evm_swaps = MagicMock()
        api_clients.evm_smart_accounts = MagicMock()
        return api_clients

    @pytest.fixture
    def mock_owner(self):
        """Create mock owner account."""
        owner = MagicMock()
        owner.address = "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        return owner

    @pytest.fixture
    def smart_account(self, mock_owner, mock_api_clients):
        """Create EvmSmartAccount instance."""
        return EvmSmartAccount(
            address="0x1234567890123456789012345678901234567890",
            owner=mock_owner,
            name="TestSmartAccount",
            api_clients=mock_api_clients,
        )

    @pytest.mark.asyncio
    async def test_swap_with_quote(self, smart_account, mock_api_clients):
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

        swap_options = SmartAccountSwapOptions(
            swap_quote=mock_quote,
            idempotency_key="test-key",
        )

        with patch(
            "cdp.actions.evm.swap.send_swap_operation.send_swap_operation"
        ) as mock_send_swap:
            mock_send_swap.return_value = SmartAccountSwapResult(
                user_op_hash="0xuserophash123",
                smart_account_address=smart_account.address,
                status="pending",
            )

            result = await smart_account.swap(swap_options)

            assert isinstance(result, SmartAccountSwapResult)
            assert result.user_op_hash == "0xuserophash123"
            assert result.smart_account_address == smart_account.address
            assert result.status == "pending"

            # Verify send_swap_operation was called
            mock_send_swap.assert_called_once()
            call_args = mock_send_swap.call_args
            assert call_args.kwargs["api_clients"] == mock_api_clients

            # Check options
            options = call_args.kwargs["options"]
            assert options.smart_account == smart_account
            assert options.network == "base"  # From quote
            assert options.swap_quote == mock_quote
            assert options.idempotency_key == "test-key"

    @pytest.mark.asyncio
    async def test_swap_with_quote_and_paymaster(self, smart_account, mock_api_clients):
        """Test swap with quote that has stored paymaster URL."""
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
        # Simulate quote created with paymaster URL
        mock_quote._paymaster_url = "https://paymaster.example.com"

        swap_options = SmartAccountSwapOptions(
            swap_quote=mock_quote,
            # No paymaster_url specified in options
        )

        with patch(
            "cdp.actions.evm.swap.send_swap_operation.send_swap_operation"
        ) as mock_send_swap:
            mock_send_swap.return_value = SmartAccountSwapResult(
                user_op_hash="0xuserophash456",
                smart_account_address=smart_account.address,
                status="pending",
            )

            _ = await smart_account.swap(swap_options)

            # Verify paymaster URL from quote was used
            call_args = mock_send_swap.call_args
            options = call_args.kwargs["options"]
            assert options.paymaster_url == "https://paymaster.example.com"

    @pytest.mark.asyncio
    async def test_swap_inline(self, smart_account, mock_api_clients):
        """Test swap method with inline parameters."""
        swap_options = SmartAccountSwapOptions(
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            slippage_bps=150,
            paymaster_url="https://paymaster.example.com",
            idempotency_key="test-key",
        )

        with patch(
            "cdp.actions.evm.swap.send_swap_operation.send_swap_operation"
        ) as mock_send_swap:
            mock_send_swap.return_value = SmartAccountSwapResult(
                user_op_hash="0xuserophash789",
                smart_account_address=smart_account.address,
                status="complete",
            )

            result = await smart_account.swap(swap_options)

            assert result.user_op_hash == "0xuserophash789"
            assert result.status == "complete"

            # Verify inline options were passed correctly
            call_args = mock_send_swap.call_args
            options = call_args.kwargs["options"]
            assert options.smart_account == smart_account
            assert options.network == "base"
            assert options.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
            assert options.to_token == "0x4200000000000000000000000000000000000006"
            assert options.from_amount == "1000000"
            assert options.taker == smart_account.address  # Smart account is taker
            assert options.slippage_bps == 150
            assert options.paymaster_url == "https://paymaster.example.com"

    @pytest.mark.asyncio
    async def test_quote_swap(self, smart_account, mock_api_clients):
        """Test quote_swap method."""
        mock_quote = QuoteSwapResult(
            liquidity_available=True,
            quote_id="quote-smart",
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

            result = await smart_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
                slippage_bps=200,
                paymaster_url="https://paymaster.example.com",
                idempotency_key="quote-key",
            )

            assert isinstance(result, QuoteSwapResult)
            assert result.quote_id == "quote-smart"
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
            assert call_args.kwargs["taker"] == smart_account.address  # Smart account is taker
            assert call_args.kwargs["slippage_bps"] == 200
            assert (
                call_args.kwargs["signer_address"] == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
            )  # Owner signs
            assert call_args.kwargs["smart_account"] == smart_account
            assert call_args.kwargs["paymaster_url"] == "https://paymaster.example.com"
            assert call_args.kwargs["idempotency_key"] == "quote-key"

    @pytest.mark.asyncio
    async def test_quote_swap_no_liquidity(self, smart_account, mock_api_clients):
        """Test quote_swap when no liquidity is available."""
        with patch("cdp.actions.evm.swap.create_swap_quote.create_swap_quote") as mock_create_quote:
            mock_create_quote.return_value = SwapUnavailableResult(liquidity_available=False)

            result = await smart_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000000000",  # Large amount
                network="base",
            )

            assert isinstance(result, SwapUnavailableResult)
            assert result.liquidity_available is False

    @pytest.mark.asyncio
    async def test_quote_swap_default_slippage(self, smart_account, mock_api_clients):
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

            result = await smart_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
                # No slippage_bps or paymaster_url specified
            )

            # Verify defaults were passed
            call_args = mock_create_quote.call_args
            assert (
                call_args.kwargs["slippage_bps"] is None
            )  # Will default to 100 in create_swap_quote
            assert call_args.kwargs["paymaster_url"] is None

    @pytest.mark.asyncio
    async def test_swap_quote_then_execute(self, smart_account, mock_api_clients):
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

        # Step 1: Get quote with paymaster URL
        with patch("cdp.actions.evm.swap.create_swap_quote.create_swap_quote") as mock_create_quote:
            mock_create_quote.return_value = mock_quote
            # Simulate the quote storing paymaster URL
            mock_quote._paymaster_url = "https://paymaster.example.com"

            quote = await smart_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
                paymaster_url="https://paymaster.example.com",
            )

        # Step 2: Execute quote
        with patch(
            "cdp.actions.evm.swap.send_swap_operation.send_swap_operation"
        ) as mock_send_swap:
            mock_send_swap.return_value = SmartAccountSwapResult(
                user_op_hash="0xexecuted_op_hash",
                smart_account_address=smart_account.address,
                status="complete",
            )

            result = await smart_account.swap(SmartAccountSwapOptions(swap_quote=quote))

            assert result.user_op_hash == "0xexecuted_op_hash"
            assert result.status == "complete"

            # Verify the quote and paymaster URL were passed correctly
            call_args = mock_send_swap.call_args
            options = call_args.kwargs["options"]
            assert options.swap_quote == quote
            assert options.paymaster_url == "https://paymaster.example.com"  # From stored quote

    @pytest.mark.asyncio
    async def test_swap_override_paymaster_url(self, smart_account, mock_api_clients):
        """Test overriding paymaster URL from quote."""
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
        # Simulate quote created with one paymaster URL
        mock_quote._paymaster_url = "https://paymaster1.example.com"

        swap_options = SmartAccountSwapOptions(
            swap_quote=mock_quote,
            paymaster_url="https://paymaster2.example.com",  # Override with different URL
        )

        with patch(
            "cdp.actions.evm.swap.send_swap_operation.send_swap_operation"
        ) as mock_send_swap:
            mock_send_swap.return_value = SmartAccountSwapResult(
                user_op_hash="0xuserophash999",
                smart_account_address=smart_account.address,
                status="pending",
            )

            await smart_account.swap(swap_options)

            # Verify override paymaster URL was used
            call_args = mock_send_swap.call_args
            options = call_args.kwargs["options"]
            assert options.paymaster_url == "https://paymaster2.example.com"  # Override wins
