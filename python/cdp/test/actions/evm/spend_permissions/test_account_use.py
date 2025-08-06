"""Tests for account_use_spend_permission function."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.spend_permissions.account_use import account_use_spend_permission
from cdp.spend_permissions import SpendPermission


@pytest.mark.asyncio
@patch("cdp.actions.evm.spend_permissions.account_use.Web3")
async def test_account_use_spend_permission(mock_web3):
    """Test using a spend permission with a regular account."""
    # Mock Web3 contract encoding
    mock_contract = MagicMock()
    mock_contract.encode_abi.return_value = "0xabcdef123456"  # Mock encoded data
    mock_web3.return_value.eth.contract.return_value = mock_contract

    # Mock Web3.to_checksum_address to return the same address (for simplicity in tests)
    def checksum_side_effect(address):
        # For tests, just return the address as-is
        return str(address) if isinstance(address, str) else str(address)

    mock_web3.to_checksum_address.side_effect = checksum_side_effect

    # Create mock API clients
    mock_api_clients = AsyncMock()
    mock_evm_accounts = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts

    # Mock the send transaction response
    mock_evm_accounts.send_evm_transaction.return_value = MagicMock(transaction_hash="0xabc123")

    # Create a spend permission
    spend_permission = SpendPermission(
        account="0x1111111111111111111111111111111111111111",
        spender="0x2222222222222222222222222222222222222222",
        token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        allowance=1000000000000000000,  # 1 ETH
        period=86400,
        start=1700000000,
        end=1700086400,
        salt=12345,
        extra_data="0x",
    )

    # Call the function
    result = await account_use_spend_permission(
        api_clients=mock_api_clients,
        address="0x2222222222222222222222222222222222222222",
        spend_permission=spend_permission,
        value=500000000000000000,  # 0.5 ETH
        network="base-sepolia",
    )

    # Verify the result
    assert result == "0xabc123"

    # Verify the API was called
    mock_evm_accounts.send_evm_transaction.assert_called_once()
    call_args = mock_evm_accounts.send_evm_transaction.call_args

    # Check the address
    assert call_args.kwargs["address"] == "0x2222222222222222222222222222222222222222"

    # Check the request contains a transaction
    send_request = call_args.kwargs["send_evm_transaction_request"]
    assert send_request.transaction.startswith("0x02")  # EIP-1559 transaction
    assert send_request.network == "base-sepolia"

    # Verify Web3.to_checksum_address was called with addresses
    # It should be called for: account, spender, token, and manager address
    assert mock_web3.to_checksum_address.call_count >= 3  # At least for the 3 permission addresses

    # Verify Web3 contract encoding was called correctly
    mock_contract.encode_abi.assert_called_once_with(
        "spend",
        args=[
            (
                "0x1111111111111111111111111111111111111111",
                "0x2222222222222222222222222222222222222222",
                "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                1000000000000000000,
                86400,
                1700000000,
                1700086400,
                12345,
                b"",
            ),
            500000000000000000,
        ],
    )
