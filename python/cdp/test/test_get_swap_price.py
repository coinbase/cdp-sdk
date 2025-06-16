"""Tests for get_swap_price functionality."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.swap.get_swap_price import (
    _check_swap_liquidity,
    _generate_swap_quote_id,
    _parse_json_response,
    get_swap_price,
)
from cdp.actions.evm.swap.types import SwapPriceResult


class TestParseJsonResponse:
    """Test _parse_json_response helper function."""

    def test_parse_valid_json(self):
        """Test parsing valid JSON response."""
        data = b'{"key": "value", "number": 123}'
        result = _parse_json_response(data, "test operation")
        assert result == {"key": "value", "number": 123}

    def test_parse_empty_response(self):
        """Test parsing empty response."""
        with pytest.raises(ValueError, match="Empty response from test operation"):
            _parse_json_response(b"", "test operation")

    def test_parse_invalid_json(self):
        """Test parsing invalid JSON."""
        with pytest.raises(ValueError, match="Invalid JSON response from test operation"):
            _parse_json_response(b"not json", "test operation")


class TestCheckSwapLiquidity:
    """Test _check_swap_liquidity helper function."""

    def test_liquidity_available(self):
        """Test when liquidity is available."""
        response = {"liquidityAvailable": True}
        # Should not raise
        _check_swap_liquidity(response)

    def test_liquidity_unavailable(self):
        """Test when liquidity is unavailable."""
        response = {"liquidityAvailable": False}
        with pytest.raises(ValueError, match="Swap unavailable: Insufficient liquidity"):
            _check_swap_liquidity(response)

    def test_liquidity_missing(self):
        """Test when liquidityAvailable key is missing."""
        response = {}
        with pytest.raises(ValueError, match="Swap unavailable: Insufficient liquidity"):
            _check_swap_liquidity(response)


class TestGenerateSwapQuoteId:
    """Test _generate_swap_quote_id helper function."""

    def test_generate_quote_id(self):
        """Test generating a quote ID."""
        quote_id = _generate_swap_quote_id("token1", "token2", "1000", "2000")
        # Should be 16 characters
        assert len(quote_id) == 16
        # Should be hexadecimal
        assert all(c in "0123456789abcdef" for c in quote_id)

    def test_generate_quote_id_consistency(self):
        """Test that same inputs generate same ID."""
        id1 = _generate_swap_quote_id("token1", "token2", "1000", "2000")
        id2 = _generate_swap_quote_id("token1", "token2", "1000", "2000")
        assert id1 == id2

    def test_generate_quote_id_different_inputs(self):
        """Test that different inputs generate different IDs."""
        id1 = _generate_swap_quote_id("token1", "token2", "1000", "2000")
        id2 = _generate_swap_quote_id("token1", "token2", "1001", "2000")
        assert id1 != id2


class TestGetSwapPrice:
    """Test get_swap_price function."""

    @pytest.fixture
    def mock_api_clients(self):
        """Create mock API clients."""
        api_clients = MagicMock()
        api_clients.evm_swaps = MagicMock()
        return api_clients

    @pytest.fixture
    def valid_response_data(self):
        """Provide valid swap price response data."""
        return {
            "liquidityAvailable": True,
            "toAmount": "500000000000000",  # 0.0005 WETH
            "quote": {
                "id": "price-123",
                "expiresAt": "2024-01-01T00:00:00Z",
            },
        }

    @pytest.mark.asyncio
    async def test_get_swap_price_success(self, mock_api_clients, valid_response_data):
        """Test successful swap price retrieval."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        # Call function
        result = await get_swap_price(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0x4200000000000000000000000000000000000006",  # WETH
            from_amount="1000000",  # 1 USDC
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        # Verify result
        assert isinstance(result, SwapPriceResult)
        # Quote ID is generated from hash, so we just check it's a 16-char hex string
        assert len(result.quote_id) == 16
        assert all(c in "0123456789abcdef" for c in result.quote_id)
        assert result.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert result.to_token == "0x4200000000000000000000000000000000000006"
        assert result.from_amount == "1000000"
        assert result.to_amount == "500000000000000"
        # Price ratio should be calculated: 500000000000000 / 1000000 = 500000000
        assert float(result.price_ratio) == 500000000.0
        # Expires at is generated as current time + 5 minutes
        assert result.expires_at.endswith("Z")
        assert len(result.expires_at) > 20  # ISO format with Z suffix

        # Verify API call
        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content.assert_called_once()
        call_args = mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content.call_args
        assert call_args.kwargs["network"].value == "base"
        assert call_args.kwargs["from_token"] == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert call_args.kwargs["to_token"] == "0x4200000000000000000000000000000000000006"
        assert call_args.kwargs["from_amount"] == "1000000"
        assert call_args.kwargs["taker"] == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"

    @pytest.mark.asyncio
    async def test_get_swap_price_with_idempotency_key(self, mock_api_clients, valid_response_data):
        """Test swap price with idempotency key."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        _ = await get_swap_price(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            idempotency_key="test-key-123",
        )

        # Verify idempotency key was passed
        call_args = mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content.call_args
        assert call_args.kwargs["_headers"]["X-Idempotency-Key"] == "test-key-123"

    @pytest.mark.asyncio
    async def test_get_swap_price_amount_as_int(self, mock_api_clients, valid_response_data):
        """Test swap price with amount as integer."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        result = await get_swap_price(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount=1000000,  # Integer
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        assert result.from_amount == "1000000"

    @pytest.mark.asyncio
    async def test_get_swap_price_no_liquidity(self, mock_api_clients):
        """Test swap price when no liquidity is available."""
        response_data = {"liquidityAvailable": False}
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(response_data).encode())

        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        with pytest.raises(ValueError, match="Swap unavailable: Insufficient liquidity"):
            await get_swap_price(
                api_clients=mock_api_clients,
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000000000",  # Large amount
                network="base",
                taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            )

    @pytest.mark.asyncio
    async def test_get_swap_price_missing_to_amount(self, mock_api_clients):
        """Test swap price with missing toAmount in response."""
        response_data = {
            "liquidityAvailable": True,
            # Missing toAmount
            "quote": {
                "id": "price-123",
                "expiresAt": "2024-01-01T00:00:00Z",
            },
        }

        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(response_data).encode())

        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        with pytest.raises(ValueError, match="Missing toAmount in response"):
            await get_swap_price(
                api_clients=mock_api_clients,
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
                taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            )

    @pytest.mark.asyncio
    async def test_get_swap_price_zero_amount(self, mock_api_clients):
        """Test swap price with zero amount."""
        response_data = {
            "liquidityAvailable": True,
            "toAmount": "0",
            "quote": {
                "id": "price-zero",
                "expiresAt": "2024-01-01T00:00:00Z",
            },
        }

        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(response_data).encode())

        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        result = await get_swap_price(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="0",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        assert result.to_amount == "0"
        # Price ratio should be 0 when from_amount is 0
        assert result.price_ratio == "0"

    @pytest.mark.asyncio
    async def test_get_swap_price_ethereum_network(self, mock_api_clients, valid_response_data):
        """Test swap price on Ethereum network."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        _ = await get_swap_price(
            api_clients=mock_api_clients,
            from_token="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC on Ethereum
            to_token="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  # WETH on Ethereum
            from_amount="1000000",
            network="ethereum",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        # Verify network was passed correctly
        call_args = mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content.call_args
        assert call_args.kwargs["network"].value == "ethereum"
