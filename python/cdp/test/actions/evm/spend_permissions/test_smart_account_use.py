"""Tests for smart_account_use_spend_permission function."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.spend_permissions.smart_account_use import smart_account_use_spend_permission
from cdp.evm_smart_account import EvmSmartAccount
from cdp.spend_permissions import SpendPermission


@pytest.mark.asyncio
@patch("cdp.actions.evm.spend_permissions.smart_account_use.send_user_operation")
@patch("cdp.actions.evm.spend_permissions.smart_account_use.Web3")
async def test_smart_account_use_spend_permission(mock_web3, mock_send_user_operation):
    """Test using a spend permission with a smart account."""
    # Mock Web3 contract encoding
    mock_contract = MagicMock()
    mock_contract.encode_abi.return_value = "0xabcdef123456"  # Mock encoded data
    mock_web3.return_value.eth.contract.return_value = mock_contract

    # Mock Web3.to_checksum_address to return proper checksum addresses
    def checksum_side_effect(address):
        # Return a proper checksum version of the address
        return address.upper() if isinstance(address, str) else str(address).upper()

    mock_web3.return_value.to_checksum_address.side_effect = checksum_side_effect

    # Create mock API clients
    mock_api_clients = AsyncMock()

    # Create a mock smart account
    mock_owner = MagicMock()
    smart_account = EvmSmartAccount(
        address="0x3333333333333333333333333333333333333333",
        owner=mock_owner,
        name="test-account",
    )
    # No need to mock owner_account separately, it's the same as owner

    # Mock the user operation response
    mock_user_operation = MagicMock()
    mock_send_user_operation.return_value = mock_user_operation

    # Create a spend permission
    spend_permission = SpendPermission(
        account="0x3333333333333333333333333333333333333333",
        spender="0x5555555555555555555555555555555555555555",
        token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        allowance=1000000000000000000,  # 1 ETH
        period=86400,
        start=1700000000,
        end=1700086400,
        salt=12345,
        extra_data="0x",
    )

    # Call the function
    result = await smart_account_use_spend_permission(
        api_clients=mock_api_clients,
        smart_account=smart_account,
        spend_permission=spend_permission,
        value=500000000000000000,  # 0.5 ETH
        network="base-sepolia",
        paymaster_url="https://paymaster.example.com",
    )

    # Verify the result
    assert result == mock_user_operation

    # Verify send_user_operation was called correctly
    mock_send_user_operation.assert_called_once()
    call_args = mock_send_user_operation.call_args

    assert call_args.kwargs["api_clients"] == mock_api_clients
    assert call_args.kwargs["address"] == "0x3333333333333333333333333333333333333333"
    assert call_args.kwargs["owner"] == smart_account.owners[0]
    assert len(call_args.kwargs["calls"]) == 1
    assert call_args.kwargs["calls"][0].to == "0XF85210B21CC50302F477BA56686D2019DC9B67AD"
    assert call_args.kwargs["calls"][0].data == "0xabcdef123456"
    assert call_args.kwargs["calls"][0].value == 0
    assert call_args.kwargs["network"] == "base-sepolia"
    assert call_args.kwargs["paymaster_url"] == "https://paymaster.example.com"

    # Verify Web3.to_checksum_address was called with addresses
    # It should be called for: account, spender, token, and manager address
    assert (
        mock_web3.return_value.to_checksum_address.call_count >= 3
    )  # At least for the 3 permission addresses

    # Verify Web3 contract encoding was called correctly
    mock_contract.encode_abi.assert_called_once_with(
        "spend",
        args=[
            (
                "0X3333333333333333333333333333333333333333",
                "0X5555555555555555555555555555555555555555",
                "0XEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
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
