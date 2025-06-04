"""Unit tests for account swap strategy."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.swap.account_swap_strategy import (
    AccountSwapStrategy,
    account_swap_strategy,
)
from cdp.actions.evm.swap.types import QuoteSwapResult, SwapResult
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount


@pytest.mark.asyncio
async def test_execute_swap_eth_to_usdc():
    """Test executing ETH to USDC swap."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x1234567890123456789012345678901234567890"
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash123")

    swap_quote = QuoteSwapResult(
        quote_id="quote-123",
        to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
        from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
        to_amount="2000000000",
        from_amount="1000000000000000000",
        min_to_amount="1950000000",
        to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",  # Valid swap contract address
        data="0xcalldata",
        value="1000000000000000000",
        network="base",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_quote,
        network="base",
    )

    # Assert
    mock_from_account.send_transaction.assert_called_once()
    tx_request = mock_from_account.send_transaction.call_args[0][0]
    assert tx_request.to == "0xDef1C0ded9bec7F1a1670819833240f027b25EfF"  # Checksummed address
    assert tx_request.data == "0xcalldata"
    assert tx_request.value == 1000000000000000000
    assert mock_from_account.send_transaction.call_args[0][1] == "base"

    assert isinstance(result, SwapResult)
    assert result.transaction_hash == "0xtxhash123"
    assert result.from_token == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    assert result.to_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    assert result.from_amount == "1000000000000000000"
    assert result.to_amount == "2000000000"
    assert result.quote_id == "quote-123"
    assert result.network == "base"


@pytest.mark.asyncio
async def test_execute_swap_with_permit2_signature():
    """Test executing swap with Permit2 signature."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x1234567890123456789012345678901234567890"
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash456")

    strategy = AccountSwapStrategy()

    # Create swap data
    swap_quote = QuoteSwapResult(
        quote_id="quote-456",
        to_token="0x4200000000000000000000000000000000000006",  # WETH
        from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
        to_amount="500000000000000000",
        from_amount="1000000000",
        min_to_amount="490000000000000000",
        to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        data="0xbaseCalldata",
        value="0",
        network="base",
    )

    # Act - with Permit2 signature
    permit2_signature = "0xabcdef1234567890"  # Mock signature
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_quote,
        network="base",
        permit2_signature=permit2_signature,
    )

    # Assert
    mock_from_account.send_transaction.assert_called_once()
    tx_request = mock_from_account.send_transaction.call_args[0][0]

    # Check that signature was appended to calldata
    # Expected: base calldata + length (64 hex chars) + signature
    expected_calldata = (
        "0xbaseCalldata"
        + "0000000000000000000000000000000000000000000000000000000000000008"  # length = 8 bytes
        + "abcdef1234567890"
    )
    assert tx_request.data == expected_calldata
    assert tx_request.value == 0

    assert result.transaction_hash == "0xtxhash456"
    assert result.from_token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    assert result.to_token == "0x4200000000000000000000000000000000000006"
    assert result.from_amount == "1000000000"
    assert result.to_amount == "500000000000000000"


@pytest.mark.asyncio
async def test_execute_swap_without_permit2():
    """Test executing swap without Permit2 signature (e.g., ETH swap)."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x1234567890123456789012345678901234567890"
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash123")

    swap_quote = QuoteSwapResult(
        quote_id="quote-123",
        to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
        from_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
        to_amount="2000000000",
        from_amount="1000000000000000000",
        min_to_amount="1950000000",
        to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        data="0xcalldata",
        value="1000000000000000000",
        network="base",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_quote,
        network="base",
    )

    # Assert
    mock_from_account.send_transaction.assert_called_once()
    tx_request = mock_from_account.send_transaction.call_args[0][0]
    assert tx_request.to == "0xDef1C0ded9bec7F1a1670819833240f027b25EfF"  # Checksummed
    assert tx_request.data == "0xcalldata"
    assert tx_request.value == 1000000000000000000
    assert mock_from_account.send_transaction.call_args[0][1] == "base"

    assert isinstance(result, SwapResult)
    assert result.transaction_hash == "0xtxhash123"


@pytest.mark.asyncio
async def test_execute_swap_with_gas_parameters():
    """Test executing swap with gas parameters."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x2345678901234567890123456789012345678901"
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash456")

    swap_quote = QuoteSwapResult(
        quote_id="quote-456",
        to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
        from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
        to_amount="500000000000000000",  # 0.5 ETH
        from_amount="1000000000",  # 1000 USDC
        min_to_amount="480000000000000000",  # Min amount after slippage
        to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        data="0x5678efgh",
        value="0",
        gas_limit=300000,
        max_fee_per_gas="50000000000",
        max_priority_fee_per_gas="2000000000",
        network="base",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_quote,
        network="base",
    )

    # Assert
    tx_request = mock_from_account.send_transaction.call_args[0][0]
    assert tx_request.gas == 300000
    assert tx_request.maxFeePerGas == 50000000000
    assert tx_request.maxPriorityFeePerGas == 2000000000

    assert result.transaction_hash == "0xtxhash456"


@pytest.mark.asyncio
async def test_execute_swap_custom_network():
    """Test executing swap on ethereum network."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x3456789012345678901234567890123456789012"
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash789")

    swap_quote = QuoteSwapResult(
        quote_id="quote-789",
        to_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
        from_token="0x4200000000000000000000000000000000000006",  # WETH
        to_amount="4000000000",  # 4000 USDC
        from_amount="2000000000000000000",  # 2 WETH
        min_to_amount="3800000000",  # Min amount after slippage
        to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        data="0x9abcijkl",
        value="0",
        network="ethereum",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_quote,
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
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x4567890123456789012345678901234567890123"
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash012")

    swap_quote = QuoteSwapResult(
        quote_id="quote-012",
        to_token="0x4200000000000000000000000000000000000006",  # WETH on Base
        from_token="0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # USDC on Base
        to_amount="2500000000000000000",  # 2.5 WETH
        from_amount="1000000000",  # 1000 USDC
        min_to_amount="2400000000000000000",  # Min amount after slippage
        to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        data="0xdefmnopq",
        value="0",
        network="base",
    )

    # Act
    strategy = AccountSwapStrategy()
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_quote,
        network="base",
    )

    # Assert
    assert result.from_token == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    assert result.to_token == "0x4200000000000000000000000000000000000006"


@pytest.mark.asyncio
async def test_execute_swap_network_parameter():
    """Test executing swap with network provided as parameter."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.send_transaction = AsyncMock(return_value="0xtxhash789")
    strategy = AccountSwapStrategy()

    # Create swap quote
    swap_quote = MagicMock(spec=QuoteSwapResult)
    swap_quote.network = "base"
    swap_quote.quote_id = "quote-789"
    swap_quote.to_token = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    swap_quote.from_token = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    swap_quote.to_amount = "1000000000"
    swap_quote.from_amount = "500000000000000000"
    swap_quote.min_to_amount = "950000000"
    swap_quote.to = "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
    swap_quote.data = "0xcalldata"
    swap_quote.value = "500000000000000000"
    swap_quote.gas_limit = None
    swap_quote.max_fee_per_gas = None
    swap_quote.max_priority_fee_per_gas = None

    # Act - provide network as parameter
    result = await strategy.execute_swap(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        swap_data=swap_quote,
        network="base",  # Provide network here
    )

    # Assert - should succeed with provided network
    assert result.network == "base"


def test_singleton_instance():
    """Test that account_swap_strategy is an instance of AccountSwapStrategy."""
    assert isinstance(account_swap_strategy, AccountSwapStrategy)
