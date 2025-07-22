"""Tests for EVM client swap functionality."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.swap.types import QuoteSwapResult, SwapUnavailableResult
from cdp.api_clients import ApiClients
from cdp.evm_client import EvmClient


@pytest.fixture
def mock_api_clients():
    """Create mock API clients."""
    api_clients = MagicMock(spec=ApiClients)
    api_clients.evm_swaps = AsyncMock()
    return api_clients


@pytest.fixture
def evm_client(mock_api_clients):
    """Create EVM client with mocked API clients."""
    return EvmClient(mock_api_clients)


class TestGetSwapPrice:
    """Test get_swap_price functionality."""

    @pytest.mark.asyncio
    async def test_get_swap_price_success(self, evm_client, mock_api_clients):
        """Test successful price retrieval."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "toAmount": "2000000000",  # Changed from buyAmount
                    "fromAmount": "1000000000000000000",  # Changed from sellAmount
                    "toToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # Changed from buyToken
                    "fromToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # Changed from sellToken
                    "minToAmount": "1980000000",  # Changed from minBuyAmount
                    "blockNumber": "123456",
                    "gasPrice": "50000000000",
                    "gas": "200000",
                    "fees": {"zeroExFee": None, "gasFee": None, "protocolFee": None},
                    "issues": {"allowance": None, "balance": None, "simulationIncomplete": False},
                }
            ).encode()
        )
        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content.return_value = (
            mock_response
        )

        # Call get_swap_price
        price = await evm_client.get_swap_price(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            from_amount="1000000000000000000",
            network="base",
            taker="0x1234567890123456789012345678901234567890",  # Test account address
        )

        # Verify price
        assert price.quote_id
        assert price.from_token == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        assert price.to_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert price.from_amount == "1000000000000000000"
        assert price.to_amount == "2000000000"  # From toAmount in response
        assert float(price.price_ratio) > 0

    @pytest.mark.asyncio
    async def test_get_swap_price_with_contract_addresses(self, evm_client, mock_api_clients):
        """Test price with contract addresses."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "toAmount": "500000000000000000",  # 0.5 ETH
                    "fromAmount": "1000000000",  # 1000 USDC
                    "toToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    "fromToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "minToAmount": "495000000000000000",
                    "blockNumber": "123457",
                    "gasPrice": "50000000000",
                    "gas": "200000",
                    "fees": {"zeroExFee": None, "gasFee": None, "protocolFee": None},
                    "issues": {"allowance": None, "balance": None, "simulationIncomplete": False},
                }
            ).encode()
        )
        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content.return_value = (
            mock_response
        )

        # Call with contract addresses
        price = await evm_client.get_swap_price(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            from_amount="1000000000",
            network="ethereum",
            taker="0x1234567890123456789012345678901234567890",  # Test account address
        )

        # Verify
        assert price.from_amount == "1000000000"
        assert price.to_amount == "500000000000000000"

    @pytest.mark.asyncio
    async def test_get_swap_price_insufficient_liquidity(self, evm_client, mock_api_clients):
        """Test price with insufficient liquidity."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps({"liquidityAvailable": False}).encode()
        )
        mock_api_clients.evm_swaps.get_evm_swap_price_without_preload_content.return_value = (
            mock_response
        )

        # Should raise error
        with pytest.raises(ValueError, match="Insufficient liquidity"):
            await evm_client.get_swap_price(
                from_token="0x0000000000000000000000000000000000000000",  # ETH contract address
                to_token="0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # USDC contract address
                from_amount="1000000000000000000000",  # Very large amount
                network="base",
                taker="0x1234567890123456789012345678901234567890",  # Test account address
            )


class TestCreateSwapQuote:
    """Test create_swap_quote functionality."""

    @pytest.mark.asyncio
    async def test_create_swap_quote_eth_to_token(self, evm_client, mock_api_clients):
        """Test creating ETH to token swap."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "toAmount": "2000000000",  # 2000 USDC
                    "fromAmount": "1000000000000000000",  # 1 ETH
                    "toToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "fromToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    "minToAmount": "1980000000",
                    "blockNumber": "123456",
                    "fees": {"zeroExFee": None, "gasFee": None, "protocolFee": None},
                    "issues": {"allowance": None, "balance": None, "simulationIncomplete": False},
                    "transaction": {
                        "to": "0x1234567890123456789012345678901234567890",
                        "data": "0xabcdef",
                        "value": "1000000000000000000",
                        "gas": "200000",
                        "gasPrice": "50000000000",
                    },
                    "permit2": None,  # No permit needed for ETH
                }
            ).encode()
        )
        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Create swap
        swap_quote = await evm_client.create_swap_quote(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            from_amount="1000000000000000000",
            network="base",
            taker="0x9876543210987654321098765432109876543210",
            slippage_bps=100,  # 1%
        )

        # Verify
        assert isinstance(swap_quote, QuoteSwapResult)
        assert swap_quote.to == "0x1234567890123456789012345678901234567890"
        assert swap_quote.data == "0xabcdef"
        assert swap_quote.value == "1000000000000000000"
        assert swap_quote.to_amount == "2000000000"
        assert swap_quote.from_amount == "1000000000000000000"
        assert swap_quote.min_to_amount == "1980000000"
        assert not swap_quote.requires_signature
        assert swap_quote.permit2_data is None

    @pytest.mark.asyncio
    async def test_create_swap_quote_token_to_token_with_permit2(
        self, evm_client, mock_api_clients
    ):
        """Test creating token to token swap with Permit2."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "toAmount": "500000000000000000",  # 0.5 WETH
                    "fromAmount": "1000000000",  # 1000 USDC
                    "toToken": "0x4200000000000000000000000000000000000006",
                    "fromToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "minToAmount": "495000000000000000",
                    "blockNumber": "123457",
                    "fees": {"zeroExFee": None, "gasFee": None, "protocolFee": None},
                    "issues": {"allowance": None, "balance": None, "simulationIncomplete": False},
                    "transaction": {
                        "to": "0x1234567890123456789012345678901234567890",
                        "data": "0xabcdef",
                        "value": "0",
                        "gas": "200000",
                        "gasPrice": "50000000000",
                    },
                    "permit2": {
                        "eip712": {
                            "domain": {
                                "name": "Permit2",
                                "chainId": 8453,
                                "verifyingContract": "0xB952578f3520EE8Ea45b7914994dcf4702cEe578",
                            },
                            "types": {"PermitTransferFrom": []},
                            "primaryType": "PermitTransferFrom",
                            "message": {},
                        },
                        "hash": "0x" + "a" * 64,  # 32 bytes = 64 hex chars
                    },
                }
            ).encode()
        )
        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Create swap
        swap_quote = await evm_client.create_swap_quote(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0x4200000000000000000000000000000000000006",  # WETH
            from_amount="1000000000",
            network="base",
            taker="0x9876543210987654321098765432109876543210",
        )

        # Verify
        assert swap_quote.requires_signature
        assert swap_quote.permit2_data is not None
        assert swap_quote.permit2_data.hash == "0x" + "a" * 64
        assert swap_quote.value == "0"

    @pytest.mark.asyncio
    async def test_create_swap_quote_custom_slippage(self, evm_client, mock_api_clients):
        """Test creating swap with custom slippage."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "toAmount": "2000000000",  # 2000 USDC
                    "fromAmount": "1000000000000000000",  # 1 ETH
                    "toToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "fromToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    "minToAmount": "1950000000",  # 2.5% slippage
                    "blockNumber": "123458",
                    "fees": {"zeroExFee": None, "gasFee": None, "protocolFee": None},
                    "issues": {"allowance": None, "balance": None, "simulationIncomplete": False},
                    "transaction": {
                        "to": "0x1234567890123456789012345678901234567890",
                        "data": "0xabcdef",
                        "value": "0",
                        "gas": "200000",
                        "gasPrice": "50000000000",
                    },
                }
            ).encode()
        )
        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Create swap with 2.5% slippage
        await evm_client.create_swap_quote(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            from_amount="1000000000000000000",
            network="ethereum",
            taker="0x9876543210987654321098765432109876543210",
            slippage_bps=250,  # 2.5%
        )

        # Verify slippage was converted to basis points (250)
        call_args = (
            mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.call_args
        )
        request = call_args[0][0]
        assert request.slippage_bps == 250

    @pytest.mark.asyncio
    async def test_create_swap_quote_invalid_json_response(self, evm_client, mock_api_clients):
        """Test create_swap_quote with invalid JSON response."""
        # Mock response with invalid JSON
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=b"invalid json")
        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Should raise error
        with pytest.raises(ValueError, match="Invalid JSON response"):
            await evm_client.create_swap_quote(
                from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                from_amount="1000000000000000000",
                network="base",
                taker="0x9876543210987654321098765432109876543210",
            )

    @pytest.mark.asyncio
    async def test_create_swap_quote_empty_response(self, evm_client, mock_api_clients):
        """Test create_swap_quote with empty response."""
        # Mock empty response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=b"")
        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Should raise error
        with pytest.raises(ValueError, match="Empty response"):
            await evm_client.create_swap_quote(
                from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                from_amount="1000000000000000000",
                network="base",
                taker="0x9876543210987654321098765432109876543210",
            )

    @pytest.mark.asyncio
    async def test_create_swap_quote_insufficient_liquidity(self, evm_client, mock_api_clients):
        """Test create_swap_quote with insufficient liquidity."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps({"liquidityAvailable": False}).encode()
        )
        mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Create swap
        swap_quote = await evm_client.create_swap_quote(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            from_amount="1000000000000000000",
            network="base",
            taker="0x9876543210987654321098765432109876543210",
            slippage_bps=100,  # 1%
        )

        # Verify we got SwapUnavailableResult
        assert isinstance(swap_quote, SwapUnavailableResult)
        assert swap_quote.liquidity_available is False
