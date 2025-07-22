"""Tests for create_swap_quote functionality."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.swap.create_swap_quote import (
    create_swap_quote,
)
from cdp.actions.evm.swap.types import Permit2Data, QuoteSwapResult, SwapUnavailableResult


class TestCreateSwapQuote:
    """Test create_swap_quote function."""

    @pytest.fixture
    def mock_api_clients(self):
        """Create mock API clients."""
        api_clients = MagicMock()
        api_clients.evm_swaps = MagicMock()
        return api_clients

    @pytest.fixture
    def valid_response_data(self):
        """Provide valid swap quote response data."""
        return {
            "liquidityAvailable": True,
            "toAmount": "500000000000000",  # 0.0005 WETH
            "minToAmount": "495000000000000",  # With slippage
            "fromAmount": "1000000",
            "fromToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "toToken": "0x4200000000000000000000000000000000000006",
            "blockNumber": "123456",
            "fees": {},
            "issues": {"simulationIncomplete": False},
            "transaction": {
                "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                "data": "0xabc123def456",
                "value": "0",
                "gas": "200000",
                "gasPrice": "20000000000",  # Required field
            },
        }

    @pytest.fixture
    def response_with_permit2(self):
        """Response data with Permit2 signature required."""
        return {
            "liquidityAvailable": True,
            "toAmount": "500000000000000",
            "minToAmount": "495000000000000",
            "fromAmount": "1000000",
            "fromToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "toToken": "0x4200000000000000000000000000000000000006",
            "blockNumber": "123456",
            "fees": {},
            "issues": {"simulationIncomplete": False},
            "transaction": {
                "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                "data": "0xabc123def456",
                "value": "0",
                "gas": "200000",
                "gasPrice": "20000000000",
            },
            "permit2": {
                "eip712": {
                    "domain": {
                        "name": "Permit2",
                        "chainId": 8453,
                        "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3",
                    },
                    "types": {
                        "EIP712Domain": [
                            {"name": "name", "type": "string"},
                            {"name": "chainId", "type": "uint256"},
                            {"name": "verifyingContract", "type": "address"},
                        ],
                        "PermitTransferFrom": [
                            {"name": "permitted", "type": "TokenPermissions"},
                            {"name": "spender", "type": "address"},
                            {"name": "nonce", "type": "uint256"},
                            {"name": "deadline", "type": "uint256"},
                        ],
                        "TokenPermissions": [
                            {"name": "token", "type": "address"},
                            {"name": "amount", "type": "uint256"},
                        ],
                    },
                    "primaryType": "PermitTransferFrom",
                    "message": {
                        "permitted": {
                            "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                            "amount": "1000000",
                        },
                        "spender": "0xFfFfFfFFfFFfFFfFFfFFFFFffFFFffffFfFFFfFf",
                        "nonce": "0",
                        "deadline": "1717123200",
                    },
                },
                "hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            },
        }

    @pytest.mark.asyncio
    async def test_create_swap_quote_success(self, mock_api_clients, valid_response_data):
        """Test successful swap quote creation."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        # Call function
        result = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0x4200000000000000000000000000000000000006",  # WETH
            from_amount="1000000",  # 1 USDC
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        # Verify result
        assert isinstance(result, QuoteSwapResult)
        assert result.liquidity_available is True
        assert result.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert result.to_token == "0x4200000000000000000000000000000000000006"
        assert result.from_amount == "1000000"
        assert result.to_amount == "500000000000000"
        assert result.min_to_amount == "495000000000000"
        assert result.to == "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
        assert result.data == "0xabc123def456"
        assert result.value == "0"
        assert result.gas_limit == 200000
        assert result.network == "base"
        assert result.requires_signature is False
        assert result.permit2_data is None

        # Verify private attributes were set
        assert result._taker == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        assert result._api_clients == mock_api_clients
        assert result._signer_address is None
        assert result._smart_account is None
        assert result._paymaster_url is None

    @pytest.mark.asyncio
    async def test_create_swap_quote_no_taker(self, mock_api_clients):
        """Test create_swap_quote without taker."""
        with pytest.raises(ValueError, match="taker is required for create_swap_quote"):
            await create_swap_quote(
                api_clients=mock_api_clients,
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="1000000",
                network="base",
                taker=None,
            )

    @pytest.mark.asyncio
    async def test_create_swap_quote_with_slippage(self, mock_api_clients, valid_response_data):
        """Test swap quote with custom slippage."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        _ = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            slippage_bps=200,  # 2% slippage
        )

        # Verify slippage was passed to API
        call_args = (
            mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.call_args
        )
        assert call_args.args[0].slippage_bps == 200

    @pytest.mark.asyncio
    async def test_create_swap_quote_default_slippage(self, mock_api_clients, valid_response_data):
        """Test swap quote with default slippage."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        _ = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            slippage_bps=None,  # Should default to 100
        )

        # Verify default slippage was used
        call_args = (
            mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.call_args
        )
        assert call_args.args[0].slippage_bps == 100

    @pytest.mark.asyncio
    async def test_create_swap_quote_no_liquidity(self, mock_api_clients):
        """Test swap quote when no liquidity is available."""
        response_data = {"liquidityAvailable": False}
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        result = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        # Should return SwapUnavailableResult
        assert isinstance(result, SwapUnavailableResult)
        assert result.liquidity_available is False

    @pytest.mark.asyncio
    async def test_create_swap_quote_with_permit2(self, mock_api_clients, response_with_permit2):
        """Test swap quote that requires Permit2 signature."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(response_with_permit2).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        result = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        assert isinstance(result, QuoteSwapResult)
        assert result.requires_signature is True
        assert result.permit2_data is not None
        assert isinstance(result.permit2_data, Permit2Data)
        assert (
            result.permit2_data.hash
            == "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        assert result.permit2_data.eip712["primaryType"] == "PermitTransferFrom"

    @pytest.mark.asyncio
    async def test_create_swap_quote_with_smart_account(
        self, mock_api_clients, valid_response_data
    ):
        """Test swap quote for smart account."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        mock_smart_account = MagicMock()
        mock_smart_account.address = "0x1234567890123456789012345678901234567890"

        result = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            taker="0x1234567890123456789012345678901234567890",
            signer_address="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",  # Owner signs
            smart_account=mock_smart_account,
            paymaster_url="https://paymaster.example.com",
        )

        # Verify smart account context was stored
        assert result._signer_address == "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
        assert result._smart_account == mock_smart_account
        assert result._paymaster_url == "https://paymaster.example.com"

    @pytest.mark.asyncio
    async def test_create_swap_quote_with_idempotency_key(
        self, mock_api_clients, valid_response_data
    ):
        """Test swap quote with idempotency key."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        _ = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="1000000",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
            idempotency_key="test-key-123",
        )

        # Verify idempotency key was passed
        call_args = (
            mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.call_args
        )
        assert call_args.kwargs["_headers"]["X-Idempotency-Key"] == "test-key-123"

    @pytest.mark.asyncio
    async def test_create_swap_quote_amount_as_int(self, mock_api_clients, valid_response_data):
        """Test swap quote with amount as integer."""
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(valid_response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        result = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount=1000000,  # Integer
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        assert result.from_amount == "1000000"

    @pytest.mark.asyncio
    async def test_create_swap_quote_with_gas_params(self, mock_api_clients):
        """Test swap quote with gas parameters in response."""
        response_data = {
            "liquidityAvailable": True,
            "toAmount": "500000000000000",
            "minToAmount": "495000000000000",
            "fromAmount": "1000000000000000",
            "fromToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "toToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "blockNumber": "123456",
            "fees": {},
            "issues": {"simulationIncomplete": False},
            "transaction": {
                "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                "data": "0xabc123def456",
                "value": "1000000000000000",  # 0.001 ETH
                "gas": "250000",
                "gasPrice": "20000000000",
                "maxFeePerGas": "30000000000",
                "maxPriorityFeePerGas": "2000000000",
            },
        }

        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=json.dumps(response_data).encode())

        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
            return_value=mock_response
        )

        result = await create_swap_quote(
            api_clients=mock_api_clients,
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            from_amount="1000000000000000",
            network="base",
            taker="0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
        )

        assert result.value == "1000000000000000"
        assert result.gas_limit == 250000
        assert result.gas_price == "20000000000"
        # Note: max_fee_per_gas and max_priority_fee_per_gas are not extracted from response
        assert result.max_fee_per_gas is None
        assert result.max_priority_fee_per_gas is None
