"""Unit tests for smart account swap strategy."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from eth_account import Account

from cdp.actions.evm.swap.smart_account_swap_strategy import (
    SmartAccountSwapStrategy,
    smart_account_swap_strategy,
)
from cdp.actions.evm.swap.types import SwapOptions, SwapQuote, SwapResult
from cdp.api_clients import ApiClients
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation as EvmUserOperationModel
from cdp.openapi_client.models.evm_call import EvmCall


@pytest.mark.asyncio
async def test_execute_swap_eth_to_usdc():
    """Test executing ETH to USDC swap with smart account."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    mock_api_clients.evm_smart_accounts = AsyncMock()
    
    # Mock create_swap response
    mock_swap_tx = MagicMock()
    mock_swap_tx.to = "0x1234567890123456789012345678901234567890"
    mock_swap_tx.data = "0x12345678"  # Valid hex data
    mock_swap_tx.value = 1000000000000000000  # 1 ETH
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    
    # Mock user operation with proper format
    mock_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "a" * 64,  # Valid 64-char hex hash
        calls=[
            EvmCall(
                to="0x1234567890123456789012345678901234567890",
                data="0x12345678",  # Valid hex data
                value="1000000000000000000",
            )
        ],
        status="pending",
    )
    
    # Update status after execution
    completed_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "a" * 64,
        calls=mock_user_op.calls,
        status="complete",
        transaction_hash="0x" + "b" * 64,  # Valid transaction hash
    )
    
    # Mock smart account
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"
    
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
    with patch("cdp.actions.evm.swap.smart_account_swap_strategy.send_user_operation") as mock_send_user_op, \
         patch("cdp.actions.evm.swap.smart_account_swap_strategy.wait_for_user_operation") as mock_wait_user_op:
        
        mock_send_user_op.return_value = mock_user_op
        mock_wait_user_op.return_value = completed_user_op
        
        strategy = SmartAccountSwapStrategy()
        result = await strategy.execute_swap(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            swap_options=swap_options,
            quote=quote,
        )
    
    # Assert
    mock_api_clients.evm.create_swap.assert_called_once_with(
        from_address=mock_smart_account.address,
        from_asset="eth",
        to_asset="usdc",
        amount="1000000000000000000",
        network="base-sepolia",
        min_amount_out="1990000000",  # 2000 USDC with 0.5% slippage
        quote_id=None,
    )
    
    mock_send_user_op.assert_called_once()
    
    assert isinstance(result, SwapResult)
    assert result.transaction_hash == "0x" + "b" * 64
    assert result.from_asset == "eth"
    assert result.to_asset == "usdc"
    assert result.from_amount == "1000000000000000000"
    assert result.to_amount == "2000000000"
    assert result.status == "completed"


@pytest.mark.asyncio
async def test_execute_swap_erc20_to_erc20():
    """Test executing ERC20 to ERC20 swap with smart account."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    mock_api_clients.evm_smart_accounts = AsyncMock()
    
    # Mock create_swap response (no value for ERC20)
    mock_swap_tx = MagicMock()
    mock_swap_tx.to = "0x3456789012345678901234567890123456789012"
    mock_swap_tx.data = "0xabcdef01"  # Valid hex data
    mock_swap_tx.value = 0  # No ETH value for ERC20 swap
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    
    # Mock user operation
    mock_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "c" * 64,
        calls=[
            EvmCall(
                to="0x3456789012345678901234567890123456789012",
                data="0xabcdef01",  # Valid hex data
                value="0",
            )
        ],
        status="pending",
    )
    
    completed_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "c" * 64,
        calls=mock_user_op.calls,
        status="complete",
        transaction_hash="0x" + "d" * 64,
    )
    
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x2345678901234567890123456789012345678901"
    
    swap_options = SwapOptions(
        from_asset="usdc",
        to_asset="weth",
        amount="5000000000",  # 5000 USDC
        network="base-sepolia",
        slippage_percentage=1.0,
    )
    
    quote = SwapQuote(
        from_asset="usdc",
        to_asset="weth",
        from_amount="5000000000",
        to_amount="2500000000000000000",  # 2.5 WETH
        price_impact=0.3,
        route=["0x2222", "0x3333", "0x4444"],
    )
    
    # Act
    with patch("cdp.actions.evm.swap.smart_account_swap_strategy.send_user_operation") as mock_send_user_op, \
         patch("cdp.actions.evm.swap.smart_account_swap_strategy.wait_for_user_operation") as mock_wait_user_op:
        
        mock_send_user_op.return_value = mock_user_op
        mock_wait_user_op.return_value = completed_user_op
        
        strategy = SmartAccountSwapStrategy()
        result = await strategy.execute_swap(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            swap_options=swap_options,
            quote=quote,
        )
    
    # Assert
    assert result.transaction_hash == "0x" + "d" * 64
    assert result.status == "completed"
    
    # Verify no value was set for ERC20 swap
    call_args = mock_send_user_op.call_args[1]["calls"][0]
    assert call_args.value == 0


@pytest.mark.asyncio
async def test_execute_swap_failed_user_operation():
    """Test handling failed user operation."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    mock_api_clients.evm_smart_accounts = AsyncMock()
    
    mock_swap_tx = MagicMock()
    mock_swap_tx.to = "0x5678901234567890123456789012345678901234"
    mock_swap_tx.data = "0xdeadbeef"  # Valid hex data
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    
    # Mock user operation
    mock_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "e" * 64,
        calls=[
            EvmCall(
                to="0x5678901234567890123456789012345678901234",
                data="0xdeadbeef",  # Valid hex data
                value="0",
            )
        ],
        status="pending",
    )
    
    # Mock failed user operation
    failed_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "e" * 64,
        calls=mock_user_op.calls,
        status="failed",
    )
    
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x3456789012345678901234567890123456789012"
    
    swap_options = SwapOptions(
        from_asset="eth",
        to_asset="usdc",
        amount="1000000000000000000",
        network="base-sepolia",
    )
    
    quote = SwapQuote(
        from_asset="eth",
        to_asset="usdc",
        from_amount="1000000000000000000",
        to_amount="2000000000",
        price_impact=0.1,
        route=["0x5555"],
    )
    
    # Act
    with patch("cdp.actions.evm.swap.smart_account_swap_strategy.send_user_operation") as mock_send_user_op, \
         patch("cdp.actions.evm.swap.smart_account_swap_strategy.wait_for_user_operation") as mock_wait_user_op:
        
        mock_send_user_op.return_value = mock_user_op
        mock_wait_user_op.return_value = failed_user_op
        
        strategy = SmartAccountSwapStrategy()
        result = await strategy.execute_swap(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            swap_options=swap_options,
            quote=quote,
        )
    
    # Assert
    assert result.status == "failed"
    assert result.transaction_hash == ""  # No transaction hash for failed operation


@pytest.mark.asyncio
async def test_execute_swap_with_quote_id():
    """Test executing swap with quote ID."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm = AsyncMock()
    mock_api_clients.evm_smart_accounts = AsyncMock()
    
    mock_swap_tx = MagicMock()
    mock_swap_tx.to = "0x7890123456789012345678901234567890123456"
    mock_swap_tx.data = "0x99887766"  # Valid hex data
    mock_api_clients.evm.create_swap = AsyncMock(return_value=mock_swap_tx)
    
    mock_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "f" * 64,
        calls=[
            EvmCall(
                to="0x7890123456789012345678901234567890123456",
                data="0x99887766",  # Valid hex data
                value="0",
            )
        ],
        status="pending",
    )
    
    completed_user_op = EvmUserOperationModel(
        network="base-sepolia",
        user_op_hash="0x" + "f" * 64,
        calls=mock_user_op.calls,
        status="complete",
        transaction_hash="0x" + "9" * 64,
    )
    
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x4567890123456789012345678901234567890123"
    
    swap_options = SwapOptions(
        from_asset="weth",
        to_asset="usdc",
        amount="1000000000000000000",  # 1 WETH
        network="base-sepolia",
        slippage_percentage=2.0,
    )
    
    quote = SwapQuote(
        from_asset="weth",
        to_asset="usdc",
        from_amount="1000000000000000000",
        to_amount="2000000000",  # 2000 USDC
        price_impact=0.5,
        route=["0x6666", "0x7777"],
        quote_id="quote-999-888",
    )
    
    # Act
    with patch("cdp.actions.evm.swap.smart_account_swap_strategy.send_user_operation") as mock_send_user_op, \
         patch("cdp.actions.evm.swap.smart_account_swap_strategy.wait_for_user_operation") as mock_wait_user_op:
        
        mock_send_user_op.return_value = mock_user_op
        mock_wait_user_op.return_value = completed_user_op
        
        strategy = SmartAccountSwapStrategy()
        result = await strategy.execute_swap(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            swap_options=swap_options,
            quote=quote,
        )
    
    # Assert
    mock_api_clients.evm.create_swap.assert_called_once()
    call_args = mock_api_clients.evm.create_swap.call_args[1]
    assert call_args["quote_id"] == "quote-999-888"
    assert call_args["min_amount_out"] == "1960000000"  # 2000 USDC with 2% slippage
    
    assert result.transaction_hash == "0x" + "9" * 64


def test_singleton_instance():
    """Test that smart_account_swap_strategy is an instance of SmartAccountSwapStrategy."""
    assert isinstance(smart_account_swap_strategy, SmartAccountSwapStrategy) 