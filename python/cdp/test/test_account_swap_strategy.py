"""Unit tests for account swap strategy."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.swap.account_swap_strategy import (
    AccountSwapStrategy,
    account_swap_strategy,
)
from cdp.actions.evm.swap.types import CreateSwapResult, SwapResult
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount


@pytest.mark.asyncio
async def test_execute_swap_eth_to_usdc():
    """Test executing ETH to USDC swap."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm_swaps = MagicMock()

    # Mock the permit2 data response
    mock_permit2_data = {
        "typed_data": {
            "domain": {"name": "Permit2"},
            "types": {},
            "primaryType": "PermitTransferFrom",
            "message": {},
        }
    }
    mock_api_clients.evm_swaps.get_swap_permit2_data = AsyncMock(return_value=mock_permit2_data)

    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x1234567890123456789012345678901234567890"
    mock_from_account.sign_typed_data = MagicMock(return_value="0x" + "a" * 130)  # 65 bytes hex
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash123")

    swap_data = CreateSwapResult(
        quote_id="quote-123",
        from_token="eth",
        to_token="usdc",
        from_amount="1000000000000000000",  # 1 ETH
        to_amount="2000000000",  # 2000 USDC
        to="0xSwapRouterAddress",
        data="0x1234abcd",
        value="0",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_data,
        network="base",
    )

    # Assert
    mock_api_clients.evm_swaps.get_swap_permit2_data.assert_called_once_with(
        mock_from_account.address,
        swap_data.to,
        swap_data.data,
    )

    mock_from_account.sign_typed_data.assert_called_once()
    mock_from_account.send_transaction.assert_called_once()

    # Check the transaction was called with appended signature
    tx_arg = mock_from_account.send_transaction.call_args[0][0]
    assert tx_arg.data.startswith("0x1234abcd")
    assert tx_arg.data.endswith("a" * 130)  # Signature appended

    assert isinstance(result, SwapResult)
    assert result.transaction_hash == "0xtxhash123"
    assert result.from_token == "eth"
    assert result.to_token == "usdc"
    assert result.from_amount == "1000000000000000000"
    assert result.to_amount == "2000000000"
    assert result.quote_id == "quote-123"
    assert result.network == "base"


@pytest.mark.asyncio
async def test_execute_swap_with_gas_parameters():
    """Test executing swap with gas parameters."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm_swaps = MagicMock()

    mock_permit2_data = {
        "typed_data": {
            "domain": {"name": "Permit2"},
            "types": {},
            "primaryType": "PermitTransferFrom",
            "message": {},
        }
    }
    mock_api_clients.evm_swaps.get_swap_permit2_data = AsyncMock(return_value=mock_permit2_data)

    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x2345678901234567890123456789012345678901"
    mock_from_account.sign_typed_data = MagicMock(return_value="0x" + "b" * 130)
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash456")

    swap_data = CreateSwapResult(
        quote_id="quote-456",
        from_token="usdc",
        to_token="eth",
        from_amount="1000000000",  # 1000 USDC
        to_amount="500000000000000000",  # 0.5 ETH
        to="0xSwapRouterAddress",
        data="0x5678efgh",
        value="0",
        gas_limit=300000,
        max_fee_per_gas="50000000000",
        max_priority_fee_per_gas="2000000000",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_data,
        network="base",
    )

    # Assert
    tx_arg = mock_from_account.send_transaction.call_args[0][0]
    assert tx_arg.gas == 300000
    assert tx_arg.maxFeePerGas == 50000000000
    assert tx_arg.maxPriorityFeePerGas == 2000000000

    assert result.transaction_hash == "0xtxhash456"


@pytest.mark.asyncio
async def test_execute_swap_custom_network():
    """Test executing swap on ethereum network."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm_swaps = MagicMock()

    mock_permit2_data = {
        "typed_data": {
            "domain": {"name": "Permit2"},
            "types": {},
            "primaryType": "PermitTransferFrom",
            "message": {},
        }
    }
    mock_api_clients.evm_swaps.get_swap_permit2_data = AsyncMock(return_value=mock_permit2_data)

    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x3456789012345678901234567890123456789012"
    mock_from_account.sign_typed_data = MagicMock(return_value="0x" + "c" * 130)
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash789")

    swap_data = CreateSwapResult(
        quote_id="quote-789",
        from_token="weth",
        to_token="usdc",
        from_amount="2000000000000000000",  # 2 WETH
        to_amount="4000000000",  # 4000 USDC
        to="0xSwapRouterAddress",
        data="0x9abcijkl",
        value="0",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_data,
        network="ethereum",
    )

    # Assert
    assert result.network == "ethereum"
    assert result.quote_id == "quote-789"


@pytest.mark.asyncio
async def test_execute_swap_contract_addresses():
    """Test executing swap with contract addresses."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm_swaps = MagicMock()

    mock_permit2_data = {
        "typed_data": {
            "domain": {"name": "Permit2"},
            "types": {},
            "primaryType": "PermitTransferFrom",
            "message": {},
        }
    }
    mock_api_clients.evm_swaps.get_swap_permit2_data = AsyncMock(return_value=mock_permit2_data)

    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x4567890123456789012345678901234567890123"
    mock_from_account.sign_typed_data = MagicMock(return_value="0x" + "d" * 130)
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash012")

    swap_data = CreateSwapResult(
        quote_id="quote-012",
        from_token="0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # USDC on Base
        to_token="0x4200000000000000000000000000000000000006",  # WETH on Base
        from_amount="1000000000",  # 1000 USDC
        to_amount="2500000000000000000",  # 2.5 WETH
        to="0xSwapRouterAddress",
        data="0xdefmnopq",
        value="0",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_data,
        network="base",
    )

    # Assert
    assert result.from_token == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    assert result.to_token == "0x4200000000000000000000000000000000000006"


@pytest.mark.asyncio
async def test_execute_swap_missing_network():
    """Test executing swap without network parameter."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)

    swap_data = CreateSwapResult(
        quote_id="quote-999",
        from_token="eth",
        to_token="usdc",
        from_amount="1000000000000000000",
        to_amount="2000000000",
        to="0xSwapRouterAddress",
        data="0x1234",
        value="0",
    )

    # Act & Assert
    strategy = AccountSwapStrategy()
    with pytest.raises(ValueError, match="Network must be provided"):
        await strategy.execute_swap(
            api_clients=mock_api_clients,
            from_account=mock_from_account,
            swap_data=swap_data,
            network=None,
        )


def test_singleton_instance():
    """Test that account_swap_strategy is an instance of AccountSwapStrategy."""
    assert isinstance(account_swap_strategy, AccountSwapStrategy)
