from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError

from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.evm_call_types import EncodedCall, FunctionCall
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.exceptions import ApiException
from cdp.openapi_client.models.evm_call import EvmCall
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.prepare_user_operation_request import (
    PrepareUserOperationRequest,
)
from cdp.openapi_client.models.send_user_operation_request import (
    SendUserOperationRequest,
)


@pytest.mark.asyncio
@patch("cdp.actions.evm.send_user_operation.Web3")
@patch("cdp.actions.evm.send_user_operation.ensure_awaitable")
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_function_call(
    mock_api_clients, mock_ensure_awaitable, mock_web3
):
    """Test sending a user operation with a FunctionCall."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_contract = MagicMock()
    mock_contract.encode_abi.return_value = "0x1234abcd"

    mock_web3_instance = MagicMock()
    mock_web3_instance.eth.contract.return_value = mock_contract
    mock_web3.return_value = mock_web3_instance

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash123"

    mock_signed_payload = MagicMock()
    mock_signed_payload.signature = bytes.fromhex("aabbcc")
    mock_ensure_awaitable.return_value = mock_signed_payload

    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        return_value=mock_user_op
    )
    mock_api_clients.evm_smart_accounts.send_user_operation = AsyncMock(return_value=mock_user_op)

    function_call = FunctionCall(
        to="0x2345678901234567890123456789012345678901",
        abi=[{"name": "transfer", "inputs": [{"type": "address"}, {"type": "uint256"}]}],
        function_name="transfer",
        args=["0x3456789012345678901234567890123456789012", 100],
        value=None,
    )

    result = await send_user_operation(
        api_clients=mock_api_clients,
        address=mock_smart_account.address,
        owner=mock_smart_account.owners[0],
        calls=[function_call],
        network="base-sepolia",
        paymaster_url="https://paymaster.example.com",
    )

    assert result == mock_user_op
    mock_contract.encode_abi.assert_called_once_with("transfer", args=function_call.args)
    mock_web3_instance.eth.contract.assert_called_once_with(
        address=function_call.to, abi=function_call.abi
    )

    expected_prepare_request = PrepareUserOperationRequest(
        network="base-sepolia",
        calls=[EvmCall(to=str(function_call.to), data="0x1234abcd", value="0")],
        paymaster_url="https://paymaster.example.com",
    )

    mock_api_clients.evm_smart_accounts.prepare_user_operation.assert_called_once()
    actual_address, actual_request = (
        mock_api_clients.evm_smart_accounts.prepare_user_operation.call_args[0]
    )
    assert actual_address == mock_smart_account.address
    assert actual_request.network == expected_prepare_request.network
    assert actual_request.paymaster_url == expected_prepare_request.paymaster_url
    assert len(actual_request.calls) == 1
    assert actual_request.calls[0].to == expected_prepare_request.calls[0].to
    assert actual_request.calls[0].data == expected_prepare_request.calls[0].data
    assert actual_request.calls[0].value == expected_prepare_request.calls[0].value

    mock_ensure_awaitable.assert_called_once_with(mock_owner.unsafe_sign_hash, "0xuserhash123")

    expected_send_request = SendUserOperationRequest(signature="0xaabbcc")
    mock_api_clients.evm_smart_accounts.send_user_operation.assert_called_once()
    actual_addr, actual_hash, actual_send_req = (
        mock_api_clients.evm_smart_accounts.send_user_operation.call_args[0]
    )
    assert actual_addr == mock_smart_account.address
    assert actual_hash == mock_user_op.user_op_hash
    assert actual_send_req.signature == expected_send_request.signature


@pytest.mark.asyncio
@patch("cdp.actions.evm.send_user_operation.Web3")
@patch("cdp.actions.evm.send_user_operation.ensure_awaitable")
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_contract_call(
    mock_api_clients, mock_ensure_awaitable, mock_web3
):
    """Test sending a user operation with a ContractCall."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_signed_payload = MagicMock()
    mock_signed_payload.signature = bytes.fromhex("ddeeff")
    mock_ensure_awaitable.return_value = mock_signed_payload

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash456"

    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        return_value=mock_user_op
    )
    mock_api_clients.evm_smart_accounts.send_user_operation = AsyncMock(return_value=mock_user_op)

    from cdp.evm_call_types import EncodedCall

    contract_call = EncodedCall(
        to="0x4567890123456789012345678901234567890123", data="0x1234abcd", value=100
    )

    result = await send_user_operation(
        api_clients=mock_api_clients,
        address=mock_smart_account.address,
        owner=mock_smart_account.owners[0],
        calls=[contract_call],
        network="base-sepolia",
        paymaster_url=None,
    )

    assert result == mock_user_op
    mock_web3.assert_not_called()
    expected_create_request = PrepareUserOperationRequest(
        network="base-sepolia",
        calls=[EvmCall(to=str(contract_call.to), data=contract_call.data, value="100")],
        paymaster_url=None,
    )
    mock_api_clients.evm_smart_accounts.prepare_user_operation.assert_called_once()
    actual_address, actual_request = (
        mock_api_clients.evm_smart_accounts.prepare_user_operation.call_args[0]
    )
    assert actual_address == mock_smart_account.address
    assert actual_request.network == expected_create_request.network
    assert actual_request.paymaster_url == expected_create_request.paymaster_url
    assert len(actual_request.calls) == 1
    assert actual_request.calls[0].to == expected_create_request.calls[0].to
    assert actual_request.calls[0].data == expected_create_request.calls[0].data
    assert actual_request.calls[0].value == expected_create_request.calls[0].value


@pytest.mark.asyncio
@patch("cdp.actions.evm.send_user_operation.Web3")
@patch("cdp.actions.evm.send_user_operation.ensure_awaitable")
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_multiple_calls(
    mock_api_clients, mock_ensure_awaitable, mock_web3
):
    """Test sending a user operation with multiple calls (mix of FunctionCall and ContractCall)."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_contract = MagicMock()
    mock_contract.encode_abi.return_value = "0x1234abcd"

    mock_web3_instance = MagicMock()
    mock_web3_instance.eth.contract.return_value = mock_contract
    mock_web3.return_value = mock_web3_instance

    mock_signed_payload = MagicMock()
    mock_signed_payload.signature = bytes.fromhex("112233")
    mock_ensure_awaitable.return_value = mock_signed_payload

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash789"

    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        return_value=mock_user_op
    )
    mock_api_clients.evm_smart_accounts.send_user_operation = AsyncMock(return_value=mock_user_op)

    function_call = FunctionCall(
        to="0x2345678901234567890123456789012345678901",
        abi=[{"name": "transfer", "inputs": [{"type": "address"}, {"type": "uint256"}]}],
        function_name="transfer",
        args=["0x3456789012345678901234567890123456789012", 100],
        value=200,
    )

    contract_call = EncodedCall(
        to="0x4567890123456789012345678901234567890123", data="0x1234abcd", value=None
    )

    result = await send_user_operation(
        api_clients=mock_api_clients,
        address=mock_smart_account.address,
        owner=mock_smart_account.owners[0],
        calls=[function_call, contract_call],
        network="base-sepolia",
        paymaster_url="https://other-paymaster.example.com",
    )

    assert result == mock_user_op
    mock_contract.encode_abi.assert_called_once_with("transfer", args=function_call.args)

    mock_api_clients.evm_smart_accounts.prepare_user_operation.assert_called_once()
    actual_address, actual_request = (
        mock_api_clients.evm_smart_accounts.prepare_user_operation.call_args[0]
    )
    assert actual_address == mock_smart_account.address
    assert actual_request.network == "base-sepolia"
    assert actual_request.paymaster_url == "https://other-paymaster.example.com"
    assert len(actual_request.calls) == 2

    assert actual_request.calls[0].to == str(function_call.to)
    assert actual_request.calls[0].data == "0x1234abcd"
    assert actual_request.calls[0].value == "200"

    assert actual_request.calls[1].to == str(contract_call.to)
    assert actual_request.calls[1].data == contract_call.data
    assert actual_request.calls[1].value == "0"


@pytest.mark.asyncio
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_empty_calls(mock_api_clients):
    """Test sending a user operation with empty calls list."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)

    with pytest.raises(ValueError, match="Calls list cannot be empty"):
        await send_user_operation(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[],
            network="base-sepolia",
            paymaster_url=None,
        )


@pytest.mark.asyncio
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_no_owners(mock_api_clients):
    """Test sending a user operation with a smart account that has no owners."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.owners = []
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    contract_call = EncodedCall(
        to="0x4567890123456789012345678901234567890123", data="0x1234abcd", value=100
    )

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        return_value=mock_user_op
    )

    with pytest.raises(IndexError):
        await send_user_operation(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[contract_call],
            network="base-sepolia",
            paymaster_url=None,
        )


@pytest.mark.asyncio
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_create_api_error(mock_api_clients):
    """Test handling API error during user operation creation."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    contract_call = EncodedCall(
        to="0x4567890123456789012345678901234567890123", data="0x1234abcd", value=100
    )

    # Simulate API error during prepare_user_operation
    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        side_effect=ApiException(status=400, reason="Bad Request")
    )

    with pytest.raises(ApiException) as exc_info:
        await send_user_operation(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[contract_call],
            network="base-sepolia",
            paymaster_url=None,
        )

    assert exc_info.value.status == 400
    assert exc_info.value.reason == "Bad Request"


@pytest.mark.asyncio
@patch("cdp.actions.evm.send_user_operation.ensure_awaitable")
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_signing_error(mock_api_clients, mock_ensure_awaitable):
    """Test handling error during operation signing."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    contract_call = EncodedCall(
        to="0x4567890123456789012345678901234567890123", data="0x1234abcd", value=100
    )

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash456"

    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        return_value=mock_user_op
    )

    # Simulate error during signing
    mock_ensure_awaitable.side_effect = Exception("Signing failed")

    with pytest.raises(Exception, match="Signing failed"):
        await send_user_operation(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[contract_call],
            network="base-sepolia",
            paymaster_url=None,
        )


@pytest.mark.asyncio
@patch("cdp.actions.evm.send_user_operation.ensure_awaitable")
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_broadcast_api_error(mock_api_clients, mock_ensure_awaitable):
    """Test handling API error during user operation broadcast."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_signed_payload = MagicMock()
    mock_signed_payload.signature = bytes.fromhex("ddeeff")
    mock_ensure_awaitable.return_value = mock_signed_payload

    contract_call = EncodedCall(
        to="0x4567890123456789012345678901234567890123", data="0x1234abcd", value=100
    )

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash456"

    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        return_value=mock_user_op
    )

    mock_api_clients.evm_smart_accounts.send_user_operation = AsyncMock(
        side_effect=ApiException(status=500, reason="Internal Server Error")
    )

    with pytest.raises(ApiException) as exc_info:
        await send_user_operation(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[contract_call],
            network="base-sepolia",
            paymaster_url=None,
        )

    assert exc_info.value.status == 500
    assert exc_info.value.reason == "Internal Server Error"


@pytest.mark.asyncio
@patch("cdp.actions.evm.send_user_operation.Web3")
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_function_call_encoding_error(mock_api_clients, mock_web3):
    """Test handling error during function call encoding."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_contract = MagicMock()
    mock_contract.encode_abi.side_effect = ValueError("Invalid argument type")

    mock_web3_instance = MagicMock()
    mock_web3_instance.eth.contract.return_value = mock_contract
    mock_web3.return_value = mock_web3_instance

    function_call = FunctionCall(
        to="0x2345678901234567890123456789012345678901",
        abi=[{"name": "transfer", "inputs": [{"type": "address"}, {"type": "uint256"}]}],
        function_name="transfer",
        args=["invalid-address", "not-a-number"],
        value=None,
    )

    with pytest.raises(ValueError, match="Invalid argument type"):
        await send_user_operation(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[function_call],
            network="base-sepolia",
            paymaster_url=None,
        )

    mock_contract.encode_abi.assert_called_once_with("transfer", args=function_call.args)


@pytest.mark.asyncio
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation_invalid_network(mock_api_clients):
    """Test handling API error due to invalid network."""
    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_owner = MagicMock(spec=EvmServerAccount)
    mock_smart_account.owners = [mock_owner]
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    contract_call = EncodedCall(
        to="0x4567890123456789012345678901234567890123", data="0x1234abcd", value=100
    )

    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        side_effect=ApiException(status=400, reason="Invalid network")
    )

    with pytest.raises(ValidationError):
        await send_user_operation(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[contract_call],
            network="invalid-network",
            paymaster_url=None,
        )
