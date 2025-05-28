"""Unit tests for account swap strategy."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.swap.account_swap_strategy import (
    AccountSwapStrategy,
    account_swap_strategy,
)
from cdp.actions.evm.swap.types import SwapOptions, SwapQuote, SwapResult
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount


@pytest.mark.asyncio
async def test_execute_swap_eth_to_usdc():
    """Test executing ETH to USDC swap."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    
    # Mock create_swap response
    mock_swap_tx = MagicMock()
    mock_swap_tx.transaction = "0x02abc123"
    mock_swap_tx.to = "0x1234567890123456789012345678901234567890"
    mock_swap_tx.data = "0xswapdata"
    mock_swap_tx.value = 0
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    
    # Mock send_transaction response
    mock_api_clients.evm.send_transaction = AsyncMock(return_value="0xtxhash123")
    
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x1234567890123456789012345678901234567890"
    
    swap_options = SwapOptions(
        from_asset="eth",
        to_asset="usdc",
        amount="1000000000000000000",  # 1 ETH
        network="base-sepolia",
        slippage_percentage=0.5,
    )
    
    quote = SwapQuote(
        from_asset="eth",
        to_asset="usdc",
        from_amount="1000000000000000000",
        to_amount="2000000000",  # 2000 USDC
        price_impact=0.1,
        route=["0x0000", "0x1111"],
    )
    
    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_options=swap_options,
        quote=quote,
    )
    
    # Assert
    mock_api_clients.evm.create_swap.assert_called_once_with(
        from_address=mock_from_account.address,
        from_asset="eth",
        to_asset="usdc",
        amount="1000000000000000000",
        network="base-sepolia",
        min_amount_out="1990000000",  # 2000 USDC with 0.5% slippage
        quote_id=None,
    )
    
    mock_api_clients.evm.send_transaction.assert_called_once_with(
        address=mock_from_account.address,
        transaction="0x02abc123",
        network="base-sepolia",
    )
    
    assert isinstance(result, SwapResult)
    assert result.transaction_hash == "0xtxhash123"
    assert result.from_asset == "eth"
    assert result.to_asset == "usdc"
    assert result.from_amount == "1000000000000000000"
    assert result.to_amount == "2000000000"
    assert result.status == "completed"


@pytest.mark.asyncio
async def test_execute_swap_with_quote_id():
    """Test executing swap with quote ID."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    
    mock_swap_tx = MagicMock()
    mock_swap_tx.transaction = "0x02def456"
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    mock_api_clients.evm.send_transaction = AsyncMock(return_value="0xtxhash456")
    
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x2345678901234567890123456789012345678901"
    
    swap_options = SwapOptions(
        from_asset="usdc",
        to_asset="eth",
        amount="1000000000",  # 1000 USDC
        network="base-sepolia",
        slippage_percentage=1.0,
    )
    
    quote = SwapQuote(
        from_asset="usdc",
        to_asset="eth",
        from_amount="1000000000",
        to_amount="500000000000000000",  # 0.5 ETH
        price_impact=0.2,
        route=["0x2222", "0x3333"],
        quote_id="quote-123-456",  # Set quote ID directly in constructor
    )
    
    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_options=swap_options,
        quote=quote,
    )
    
    # Assert
    mock_api_clients.evm.create_swap.assert_called_once_with(
        from_address=mock_from_account.address,
        from_asset="usdc",
        to_asset="eth",
        amount="1000000000",
        network="base-sepolia",
        min_amount_out="495000000000000000",  # 0.5 ETH with 1% slippage
        quote_id="quote-123-456",
    )
    
    assert result.transaction_hash == "0xtxhash456"


@pytest.mark.asyncio
async def test_execute_swap_custom_slippage():
    """Test executing swap with custom slippage."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    
    mock_swap_tx = MagicMock()
    mock_swap_tx.transaction = "0x02ghi789"
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    mock_api_clients.evm.send_transaction = AsyncMock(return_value="0xtxhash789")
    
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x3456789012345678901234567890123456789012"
    
    swap_options = SwapOptions(
        from_asset="weth",
        to_asset="usdc",
        amount="2000000000000000000",  # 2 WETH
        network="base-sepolia",
        slippage_percentage=2.5,
    )
    
    quote = SwapQuote(
        from_asset="weth",
        to_asset="usdc",
        from_amount="2000000000000000000",
        to_amount="4000000000",  # 4000 USDC
        price_impact=0.5,
        route=["0x4444"],
    )
    
    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_options=swap_options,
        quote=quote,
    )
    
    # Assert
    mock_api_clients.evm.create_swap.assert_called_once()
    call_args = mock_api_clients.evm.create_swap.call_args[1]
    assert call_args["min_amount_out"] == "3900000000"  # 4000 USDC with 2.5% slippage
    
    assert result.status == "completed"


@pytest.mark.asyncio
async def test_execute_swap_contract_addresses():
    """Test executing swap with contract addresses."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    
    mock_swap_tx = MagicMock()
    mock_swap_tx.transaction = "0x02jkl012"
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    mock_api_clients.evm.send_transaction = AsyncMock(return_value="0xtxhash012")
    
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x4567890123456789012345678901234567890123"
    
    swap_options = SwapOptions(
        from_asset="0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # USDC address
        to_asset="0x4200000000000000000000000000000000000006",  # WETH address
        amount="5000000000",  # 5000 USDC
        network="base-sepolia",
    )
    
    quote = SwapQuote(
        from_asset="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        to_asset="0x4200000000000000000000000000000000000006",
        from_amount="5000000000",
        to_amount="2500000000000000000",  # 2.5 WETH
        price_impact=0.3,
        route=["0x5555", "0x6666"],
    )
    
    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_options=swap_options,
        quote=quote,
    )
    
    # Assert
    mock_api_clients.evm.create_swap.assert_called_once()
    call_args = mock_api_clients.evm.create_swap.call_args[1]
    assert call_args["from_asset"] == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    assert call_args["to_asset"] == "0x4200000000000000000000000000000000000006"
    
    assert result.from_asset == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    assert result.to_asset == "0x4200000000000000000000000000000000000006"


def test_singleton_instance():
    """Test that account_swap_strategy is an instance of AccountSwapStrategy."""
    assert isinstance(account_swap_strategy, AccountSwapStrategy) 