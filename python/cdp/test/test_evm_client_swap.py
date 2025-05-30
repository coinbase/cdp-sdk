"""Tests for EVM client swap functionality."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.swap.types import SwapQuote, SwapTransaction
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


class TestGetQuote:
    """Test get_quote functionality."""

    @pytest.mark.asyncio
    async def test_get_quote_success(self, evm_client, mock_api_clients):
        """Test successful quote retrieval."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "buyAmount": "2000000000",  # 2000 USDC
                    "sellAmount": "1000000000000000000",  # 1 ETH
                    "buyToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "sellToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    "minBuyAmount": "1980000000",
                    "blockNumber": "123456",
                    "gasPrice": "50000000000",
                    "gas": "200000",
                    "fees": {"zeroExFee": None, "gasFee": None, "protocolFee": None},
                    "issues": {"allowance": None, "balance": None, "simulationIncomplete": False},
                }
            ).encode()
        )
        mock_api_clients.evm_swaps.get_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Call get_quote
        quote = await evm_client.get_quote(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            amount="1000000000000000000",
            network="base",
        )

        # Verify
        assert isinstance(quote, SwapQuote)
        assert quote.from_token == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        assert quote.to_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        assert quote.from_amount == "1000000000000000000"
        assert quote.to_amount == "2000000000"
        # Price ratio is calculated as to_amount / from_amount
        # 2000000000 / 1000000000000000000 = 2e-09
        assert quote.price_ratio == "2e-09"

    @pytest.mark.asyncio
    async def test_get_quote_with_contract_addresses(self, evm_client, mock_api_clients):
        """Test quote with contract addresses."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "buyAmount": "500000000000000000",  # 0.5 ETH
                    "sellAmount": "1000000000",  # 1000 USDC
                    "buyToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    "sellToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "minBuyAmount": "495000000000000000",
                    "blockNumber": "123457",
                    "gasPrice": "50000000000",
                    "gas": "200000",
                    "fees": {"zeroExFee": None, "gasFee": None, "protocolFee": None},
                    "issues": {"allowance": None, "balance": None, "simulationIncomplete": False},
                }
            ).encode()
        )
        mock_api_clients.evm_swaps.get_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Call with contract addresses
        quote = await evm_client.get_quote(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            amount="1000000000",
            network="ethereum",
        )

        # Verify
        assert quote.from_amount == "1000000000"
        assert quote.to_amount == "500000000000000000"

    @pytest.mark.asyncio
    async def test_get_quote_insufficient_liquidity(self, evm_client, mock_api_clients):
        """Test quote with insufficient liquidity."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps({"liquidityAvailable": False}).encode()
        )
        mock_api_clients.evm_swaps.get_evm_swap_quote_without_preload_content.return_value = (
            mock_response
        )

        # Should raise error
        with pytest.raises(ValueError, match="Insufficient liquidity"):
            await evm_client.get_quote(
                from_token="0x0000000000000000000000000000000000000000",  # ETH contract address
                to_token="0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # USDC contract address
                amount="1000000000000000000000",  # Very large amount
                network="base",
            )


class TestCreateSwap:
    """Test create_swap functionality."""

    @pytest.mark.asyncio
    async def test_create_swap_eth_to_token(self, evm_client, mock_api_clients):
        """Test creating ETH to token swap."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "buyAmount": "2000000000",  # 2000 USDC
                    "sellAmount": "1000000000000000000",  # 1 ETH
                    "buyToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "sellToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    "minBuyAmount": "1980000000",
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
        mock_api_clients.evm_swaps.create_evm_swap_without_preload_content.return_value = (
            mock_response
        )

        # Create swap
        swap_tx = await evm_client.create_swap(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            amount="1000000000000000000",
            network="base",
            wallet_address="0x9876543210987654321098765432109876543210",
            slippage_percentage=1.0,
        )

        # Verify
        assert isinstance(swap_tx, SwapTransaction)
        assert swap_tx.to == "0x1234567890123456789012345678901234567890"
        assert swap_tx.data == "0xabcdef"
        assert swap_tx.value == 1000000000000000000
        assert not swap_tx.requires_signature
        assert swap_tx.permit2_data is None

    @pytest.mark.asyncio
    async def test_create_swap_token_to_token_with_permit2(self, evm_client, mock_api_clients):
        """Test creating token to token swap with Permit2."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "buyAmount": "500000000000000000",  # 0.5 WETH
                    "sellAmount": "1000000000",  # 1000 USDC
                    "buyToken": "0x4200000000000000000000000000000000000006",
                    "sellToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "minBuyAmount": "495000000000000000",
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
        mock_api_clients.evm_swaps.create_evm_swap_without_preload_content.return_value = (
            mock_response
        )

        # Create swap
        swap_tx = await evm_client.create_swap(
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0x4200000000000000000000000000000000000006",  # WETH
            amount="1000000000",
            network="base",
            wallet_address="0x9876543210987654321098765432109876543210",
        )

        # Verify
        assert swap_tx.requires_signature
        assert swap_tx.permit2_data is not None
        assert swap_tx.permit2_data.hash == "0x" + "a" * 64
        assert swap_tx.value == 0

    @pytest.mark.asyncio
    async def test_create_swap_custom_slippage(self, evm_client, mock_api_clients):
        """Test creating swap with custom slippage."""
        # Mock response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(
            return_value=json.dumps(
                {
                    "liquidityAvailable": True,
                    "buyAmount": "2000000000",  # 2000 USDC
                    "sellAmount": "1000000000000000000",  # 1 ETH
                    "buyToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "sellToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    "minBuyAmount": "1950000000",  # 2.5% slippage
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
        mock_api_clients.evm_swaps.create_evm_swap_without_preload_content.return_value = (
            mock_response
        )

        # Create swap with 2.5% slippage
        await evm_client.create_swap(
            from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            amount="1000000000000000000",
            network="ethereum",
            wallet_address="0x9876543210987654321098765432109876543210",
            slippage_percentage=2.5,
        )

        # Verify slippage was converted to basis points (250)
        call_args = mock_api_clients.evm_swaps.create_evm_swap_without_preload_content.call_args
        request = call_args[0][0]
        assert request.slippage_bps == 250

    @pytest.mark.asyncio
    async def test_create_swap_invalid_json_response(self, evm_client, mock_api_clients):
        """Test create_swap with invalid JSON response."""
        # Mock response with invalid JSON
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=b"invalid json")
        mock_api_clients.evm_swaps.create_evm_swap_without_preload_content.return_value = (
            mock_response
        )

        # Should raise error
        with pytest.raises(ValueError, match="Invalid JSON response"):
            await evm_client.create_swap(
                from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                amount="1000000000000000000",
                network="base",
                wallet_address="0x9876543210987654321098765432109876543210",
            )

    @pytest.mark.asyncio
    async def test_create_swap_empty_response(self, evm_client, mock_api_clients):
        """Test create_swap with empty response."""
        # Mock empty response
        mock_response = AsyncMock()
        mock_response.read = AsyncMock(return_value=b"")
        mock_api_clients.evm_swaps.create_evm_swap_without_preload_content.return_value = (
            mock_response
        )

        # Should raise error
        with pytest.raises(ValueError, match="Empty response"):
            await evm_client.create_swap(
                from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                amount="1000000000000000000",
                network="base",
                wallet_address="0x9876543210987654321098765432109876543210",
            )
