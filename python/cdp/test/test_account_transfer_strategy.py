from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.transfer.account_transfer_strategy import (
    AccountTransferStrategy,
    account_transfer_strategy,
)
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.openapi_client.models.send_evm_transaction200_response import (
    SendEvmTransaction200Response,
)
from cdp.openapi_client.models.send_evm_transaction_request import SendEvmTransactionRequest


@pytest.mark.asyncio
async def test_execute_transfer_eth():
    """Test executing ETH transfer."""
    # Arrange
    with (
        patch("cdp.actions.evm.transfer.utils.get_erc20_address") as mock_get_erc20_address,
    ):
        mock_api_clients = MagicMock(spec=ApiClients)
        mock_api_clients.evm_accounts = AsyncMock()
        mock_api_clients.evm_accounts.send_evm_transaction = AsyncMock(
            return_value=SendEvmTransaction200Response(transaction_hash="0xabc123")
        )

        mock_from_account = MagicMock(spec=EvmServerAccount)
        mock_from_account.address = "0x1234567890123456789012345678901234567890"

        to_address = "0x2345678901234567890123456789012345678901"
        value = 1000000000000000000  # 1 ETH

        # Act
        strategy = AccountTransferStrategy()
        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_from_account,
            to=to_address,
            value=value,
            token="eth",
            network="base-sepolia",
        )

        # Assert
        mock_api_clients.evm_accounts.send_evm_transaction.assert_called_once_with(
            address=mock_from_account.address,
            send_evm_transaction_request=SendEvmTransactionRequest(
                transaction="0x02e88080808080942345678901234567890123456789012345678901880de0b6b3a764000080c0808080",
                network="base-sepolia",
            ),
        )
        assert result == "0xabc123"
        mock_get_erc20_address.assert_not_called()


@pytest.mark.asyncio
async def test_execute_transfer_erc20():
    """Test executing ERC20 token transfer."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.evm_accounts = AsyncMock()
    mock_api_clients.evm_accounts.send_evm_transaction = AsyncMock(
        side_effect=[
            SendEvmTransaction200Response(transaction_hash="0xapprove123"),
            SendEvmTransaction200Response(transaction_hash="0xtransfer456"),
        ]
    )

    mock_from_account = MagicMock(spec=EvmServerAccount)
    mock_from_account.address = "0x1234567890123456789012345678901234567890"

    to_address = "0x2345678901234567890123456789012345678901"
    value = 1000000  # 1 USDC (6 decimals)

    # Act
    strategy = AccountTransferStrategy()
    result = await strategy.execute_transfer(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        to=to_address,
        value=value,
        token="usdc",
        network="base-sepolia",
    )

    # Assert
    assert mock_api_clients.evm_accounts.send_evm_transaction.call_count == 2

    assert result == "0xtransfer456"


def test_singleton_instance():
    """Test that account_transfer_strategy is an instance of AccountTransferStrategy."""
    assert isinstance(account_transfer_strategy, AccountTransferStrategy)
