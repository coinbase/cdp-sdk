"""Unit tests for EVM client swap methods."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.api_clients import ApiClients
from cdp.evm_client import EvmClient


class TestEvmClientSwap:
    """Test EVM client swap methods."""

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
            network="base-sepolia"
        )
        
        # Assert
        assert quote is not None
        assert quote.from_asset == "eth"
        assert quote.to_asset == "usdc"
        assert quote.from_amount == "1000000000000000000"
        assert quote.to_amount == "2000000000000000000"  # Mock 2x output
        assert quote.price_impact == 0.1
        assert len(quote.route) == 2
        assert quote.gas_estimate == "100000"

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
            network="base-sepolia"
        )
        
        # Assert
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
            network="base-sepolia"
        )
        
        # Assert
        assert quote.from_asset == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        assert quote.to_asset == "0x4200000000000000000000000000000000000006"

    @pytest.mark.asyncio
    async def test_create_swap_eth_to_usdc(self):
        """Test creating swap transaction for ETH to USDC."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            from_address="0x1234567890123456789012345678901234567890",
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000000000",  # 1 ETH
            network="base-sepolia",
            min_amount_out="1990000000",  # With slippage
            quote_id=None,
        )
        
        # Assert
        assert swap_tx is not None
        assert swap_tx.to == "0x0000000000000000000000000000000000000000"  # Mock router
        assert swap_tx.data == "0x"  # Mock calldata
        assert swap_tx.value == 1000000000000000000  # ETH value
        assert swap_tx.transaction is not None

    @pytest.mark.asyncio
    async def test_create_swap_erc20_to_erc20(self):
        """Test creating swap transaction for ERC20 to ERC20."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            from_address="0x2345678901234567890123456789012345678901",
            from_asset="usdc",
            to_asset="weth",
            amount="1000000000",  # 1000 USDC
            network="base-sepolia",
            min_amount_out="495000000000000000",
            quote_id="quote-123",
        )
        
        # Assert
        assert swap_tx.value == 0  # No ETH value for ERC20 swap
        assert swap_tx.to == "0x0000000000000000000000000000000000000000"  # Mock router

    @pytest.mark.asyncio
    async def test_create_swap_with_string_amount(self):
        """Test creating swap with string amount."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            from_address="0x3456789012345678901234567890123456789012",
            from_asset="eth",
            to_asset="usdc",
            amount="500000000000000000",  # 0.5 ETH as string
            network="base-sepolia",
            min_amount_out="990000000",
        )
        
        # Assert
        assert swap_tx.value == 500000000000000000

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
                network="base-sepolia"
            )
            
            # Assert
            assert mock_resolve.call_count == 2
            mock_resolve.assert_any_call("eth", "base-sepolia")
            mock_resolve.assert_any_call("usdc", "base-sepolia")

    @pytest.mark.asyncio
    async def test_create_swap_formats_amount(self):
        """Test that create_swap properly converts amounts to string."""
        # Arrange
        mock_api_clients = MagicMock(spec=ApiClients)
        evm_client = EvmClient(mock_api_clients)
        
        # Act
        swap_tx = await evm_client.create_swap(
            from_address="0x4567890123456789012345678901234567890123",
            from_asset="eth",
            to_asset="usdc",
            amount=1000000000000000000,  # 1 ETH as int
            network="base-sepolia",
            min_amount_out="1990000000",
        )
        
        # Assert that the value was properly set
        assert swap_tx.value == 1000000000000000000 
