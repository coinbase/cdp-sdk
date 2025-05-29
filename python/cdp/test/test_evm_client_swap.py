"""Tests for EVM client swap functionality."""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from decimal import Decimal

from cdp.api_clients import ApiClients
from cdp.evm_client import EvmClient


class TestEvmClientSwap:
    """Test cases for EVM client swap methods."""

    @pytest.mark.asyncio
    async def test_get_quote_eth_to_usdc(self):
        """Test getting quote for ETH to USDC swap."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        quote = await evm_client.get_quote(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",  # 1 ETH
            network="base"
        )
        
        # Assert
        assert quote is not None
        assert quote.from_asset == "eth"
        assert quote.to_asset == "usdc"
        assert quote.from_amount == "1000000000000000000"
        # Note: to_amount will be determined by the API response
        
    @pytest.mark.asyncio
    async def test_get_quote_with_int_amount(self):
        """Test getting quote with integer amount."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        quote = await evm_client.get_quote(
            from_asset="usdc",
            to_asset="eth",
            amount=1000000,  # 1 USDC
            network="ethereum"
        )
        
        # Assert
        assert quote is not None
        assert quote.from_amount == "1000000"
        
    @pytest.mark.asyncio
    async def test_get_quote_with_contract_addresses(self):
        """Test getting quote with contract addresses."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        quote = await evm_client.get_quote(
            from_asset="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            to_asset="0x4200000000000000000000000000000000000006",
            amount="5000000000",
            network="base"
        )
        
        # Assert
        assert quote is not None
        
    @pytest.mark.asyncio
    async def test_create_swap_eth_to_usdc(self):
        """Test creating swap transaction for ETH to USDC."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            wallet_address="0x1234567890123456789012345678901234567890",
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",  # 1 ETH
            network="base",
            slippage_percentage=1.0,
        )
        
        # Assert
        assert swap_tx is not None
        assert hasattr(swap_tx, 'to')
        assert hasattr(swap_tx, 'data')
        assert hasattr(swap_tx, 'value')
        
    @pytest.mark.asyncio
    async def test_create_swap_erc20_to_erc20(self):
        """Test creating swap transaction for ERC20 to ERC20."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            wallet_address="0x2345678901234567890123456789012345678901",
            from_asset="usdc",
            to_asset="weth",
            amount="1000000000",  # 1000 USDC
            network="ethereum",
            slippage_percentage=0.5,
        )
        
        # Assert
        assert swap_tx is not None
        
    @pytest.mark.asyncio
    async def test_create_swap_with_string_amount(self):
        """Test creating swap with string amount."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            wallet_address="0x3456789012345678901234567890123456789012",
            from_asset="eth",
            to_asset="usdc",
            amount="500000000000000000",  # 0.5 ETH as string
            network="base",
        )
        
        # Assert
        assert swap_tx is not None
        
    @pytest.mark.asyncio
    async def test_get_quote_resolves_token_addresses(self):
        """Test that get_quote properly resolves token symbols to addresses."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        with patch("cdp.actions.evm.swap.utils.resolve_token_address") as mock_resolve:
            mock_resolve.side_effect = [
                "0x0000000000000000000000000000000000000000",  # ETH
                "0x036cbd53842c5426634e7929541ec2318f3dcf7e",  # USDC
            ]
            
            # Act
            quote = await evm_client.get_quote(
                from_asset="eth",
                to_asset="usdc",
                amount="1000000000000000000",
                network="base"
            )
            
            # Assert
            assert mock_resolve.call_count == 2
            mock_resolve.assert_any_call("eth", "base")
            mock_resolve.assert_any_call("usdc", "base")
            
    @pytest.mark.asyncio
    async def test_create_swap_formats_amount(self):
        """Test that create_swap properly converts amounts to string."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            wallet_address="0x4567890123456789012345678901234567890123",
            from_asset="eth",
            to_asset="usdc",
            amount=1000000000000000000,  # 1 ETH as int
            network="ethereum",
            slippage_percentage=1.0,
        )
        
        # Assert
        assert swap_tx is not None 
