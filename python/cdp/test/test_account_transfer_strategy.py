from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from eth_typing import HexStr
from web3.exceptions import TimeExhausted

from cdp.actions.evm.transfer.account_transfer_strategy import (
    AccountTransferStrategy,
    account_transfer_strategy,
)
from cdp.actions.evm.transfer.types import TransferOptions
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

        transfer_args = TransferOptions(
            to=to_address,
            amount=value,
            token="eth",
            network="base-sepolia",
        )

        # Act
        strategy = AccountTransferStrategy()
        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_from_account,
            transfer_args=transfer_args,
            to=to_address,
            value=value,
        )

        # Assert
        mock_api_clients.evm_accounts.send_evm_transaction.assert_called_once_with(
            address=mock_from_account.address,
            send_evm_transaction_request=SendEvmTransactionRequest(
                transaction="0x02e88080808080942345678901234567890123456789012345678901880de0b6b3a764000080c0808080",
                network=transfer_args.network,
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

    transfer_args = TransferOptions(
        to=to_address,
        amount=value,
        token="usdc",
        network="base-sepolia",
    )

    # Act
    strategy = AccountTransferStrategy()
    result = await strategy.execute_transfer(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        transfer_args=transfer_args,
        to=to_address,
        value=value,
    )

    # Assert
    assert mock_api_clients.evm_accounts.send_evm_transaction.call_count == 2

    assert result == "0xtransfer456"


@pytest.mark.asyncio
async def test_wait_for_result_success():
    """Test waiting for a successful transaction result."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)

    mock_w3 = MagicMock()
    mock_w3.eth = MagicMock()
    mock_receipt = MagicMock()
    mock_receipt.status = 1
    mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt
    mock_w3.eth.chain_id = 1  # Ethereum mainnet

    tx_hash = HexStr("0xabc123")

    # Act
    strategy = AccountTransferStrategy()
    result = await strategy.wait_for_result(
        api_clients=mock_api_clients,
        from_account=mock_from_account,
        w3=mock_w3,
        hash=tx_hash,
    )

    # Assert
    mock_w3.eth.wait_for_transaction_receipt.assert_called_once_with(tx_hash)
    assert result.status == "success"
    assert result.transaction_hash == tx_hash


@pytest.mark.asyncio
async def test_wait_for_result_failed_transaction():
    """Test waiting for a failed transaction."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)

    mock_w3 = MagicMock()
    mock_w3.eth = MagicMock()
    mock_receipt = MagicMock()
    mock_receipt.status = 0  # Failed transaction
    mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt
    mock_w3.eth.chain_id = 1  # Ethereum mainnet

    tx_hash = HexStr("0xabc123")

    # Act & Assert
    strategy = AccountTransferStrategy()
    with pytest.raises(Exception) as exc_info:
        await strategy.wait_for_result(
            api_clients=mock_api_clients,
            from_account=mock_from_account,
            w3=mock_w3,
            hash=tx_hash,
        )

    assert "Transaction failed" in str(exc_info.value)
    assert tx_hash in str(exc_info.value)


@pytest.mark.asyncio
async def test_wait_for_result_timeout():
    """Test transaction timeout while waiting for result."""
    # Arrange
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_from_account = MagicMock(spec=EvmServerAccount)

    mock_w3 = MagicMock()
    mock_w3.eth = MagicMock()
    mock_w3.eth.wait_for_transaction_receipt.side_effect = TimeExhausted("Transaction timed out")
    mock_w3.eth.chain_id = 1  # Ethereum mainnet

    tx_hash = HexStr("0xabc123")

    # Act & Assert
    strategy = AccountTransferStrategy()
    with pytest.raises(TimeoutError) as exc_info:
        await strategy.wait_for_result(
            api_clients=mock_api_clients,
            from_account=mock_from_account,
            w3=mock_w3,
            hash=tx_hash,
        )

    assert "Transaction timed out" in str(exc_info.value)
    assert tx_hash in str(exc_info.value)


def test_singleton_instance():
    """Test that account_transfer_strategy is an instance of AccountTransferStrategy."""
    assert isinstance(account_transfer_strategy, AccountTransferStrategy)
