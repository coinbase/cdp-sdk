import pytest
from unittest.mock import AsyncMock, patch

from cdp.api_clients import ApiClients
from cdp.evm_client import EvmClient
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.models.create_evm_account_request import CreateEvmAccountRequest
from cdp.openapi_client.models.create_evm_smart_account_request import (
    CreateEvmSmartAccountRequest,
)


from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest
from cdp.openapi_client.models.sign_evm_transaction_request import (
    SignEvmTransactionRequest,
)


def test_init():
    """Test the initialization of the EvmClient."""
    client = EvmClient(
        api_clients=ApiClients(
            CdpApiClient(
                api_key_id="test_api_key_id",
                api_key_secret="test_api_key_secret",
                wallet_secret="test_wallet_secret",
            )
        )
    )

    assert client.api_clients._cdp_client.api_key_id == "test_api_key_id"
    assert client.api_clients._cdp_client.api_key_secret == "test_api_key_secret"
    assert client.api_clients._cdp_client.wallet_secret == "test_wallet_secret"
    assert hasattr(client, "api_clients")


@pytest.mark.asyncio
async def test_create_account(server_account_model_factory):
    """Test creating an EVM account."""
    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.create_evm_account = AsyncMock(
        return_value=evm_server_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_name = "test-account"
    test_idempotency_key = "65514b9d-ffa1-4d46-ac59-ac88b5f651ae"

    result = await client.create_account(
        name=test_name, idempotency_key=test_idempotency_key
    )

    mock_evm_accounts_api.create_evm_account.assert_called_once_with(
        x_idempotency_key=test_idempotency_key,
        create_evm_account_request=CreateEvmAccountRequest(name=test_name),
    )

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_list_accounts(server_account_model_factory):
    """Test listing EVM accounts."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model_1 = server_account_model_factory(
        address="0x1234567890123456789012345678901234567890", name="test-account-1"
    )
    evm_server_account_model_2 = server_account_model_factory(
        address="0x2345678901234567890123456789012345678901", name="test-account-2"
    )

    mock_response = AsyncMock()
    mock_response.accounts = [evm_server_account_model_1, evm_server_account_model_2]
    mock_response.next_page_token = "next-page-token"
    mock_evm_accounts_api.list_evm_accounts = AsyncMock(return_value=mock_response)

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.list_accounts()

    mock_evm_accounts_api.list_evm_accounts.assert_called_once_with(
        page_size=None, page_token=None
    )

    assert len(result["evm_accounts"]) == 2
    assert result["evm_accounts"][0].address == evm_server_account_model_1.address
    assert result["evm_accounts"][0].name == evm_server_account_model_1.name
    assert result["evm_accounts"][1].address == evm_server_account_model_2.address
    assert result["evm_accounts"][1].name == evm_server_account_model_2.name
    assert result["next_page_token"] == "next-page-token"


@pytest.mark.asyncio
async def test_get_account(server_account_model_factory):
    """Test getting an EVM account by address."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api.get_evm_account = AsyncMock(
        return_value=evm_server_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    result = await client.get_account(address=test_address)

    mock_evm_accounts_api.get_evm_account.assert_called_once_with(test_address)

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_get_account_by_name(server_account_model_factory):
    """Test getting an EVM account by name."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api.get_evm_account_by_name = AsyncMock(
        return_value=evm_server_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_name = "test-account"
    result = await client.get_account(name=test_name)

    mock_evm_accounts_api.get_evm_account_by_name.assert_called_once_with(test_name)

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_get_account_throws_error_if_neither_address_nor_name_is_provided():
    """Test that the get_account method throws an error if neither address nor name is provided."""
    client = EvmClient(api_clients=AsyncMock())
    with pytest.raises(ValueError):
        await client.get_account()


@pytest.mark.asyncio
async def test_create_smart_account(smart_account_model_factory):
    """Test creating an EVM smart account."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api
    evm_smart_account_model = smart_account_model_factory()
    mock_evm_smart_accounts_api.create_evm_smart_account = AsyncMock(
        return_value=evm_smart_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.create_smart_account(evm_smart_account_model)

    mock_evm_smart_accounts_api.create_evm_smart_account.assert_called_once_with(
        CreateEvmSmartAccountRequest(owners=[evm_smart_account_model.address])
    )

    assert result.address == evm_smart_account_model.address
    assert result.name == evm_smart_account_model.name


@pytest.mark.asyncio
@patch("cdp.evm_client.send_user_operation")
async def test_send_user_operation(
    mock_send_user_operation, smart_account_model_factory
):
    """Test sending a user operation for a smart account."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api
    client = EvmClient(api_clients=mock_api_clients)

    smart_account_model = smart_account_model_factory()
    mock_calls = [{"to": "0x123", "data": "0xabcdef"}]
    test_network = "ethereum"
    test_paymaster_url = "https://paymaster.example.com"

    mock_user_operation = {"hash": "0x456", "sender": smart_account_model.address}
    mock_send_user_operation.return_value = mock_user_operation

    result = await client.send_user_operation(
        smart_account=smart_account_model,
        calls=mock_calls,
        network=test_network,
        paymaster_url=test_paymaster_url,
    )

    mock_send_user_operation.assert_called_once_with(
        client.api_clients,
        smart_account_model,
        mock_calls,
        test_network,
        test_paymaster_url,
    )

    assert result == mock_user_operation


@pytest.mark.asyncio
@patch("cdp.evm_client.wait_for_user_operation")
async def test_wait_for_user_operation(
    mock_wait_for_user_operation, smart_account_model_factory
):
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api
    client = EvmClient(api_clients=mock_api_clients)

    smart_account_model = smart_account_model_factory()
    mock_user_operation = {"hash": "0x456", "sender": smart_account_model.address}
    mock_wait_result = {"receipt": {"blockHash": "0x789"}}

    mock_wait_for_user_operation.return_value = mock_wait_result

    result = await client.wait_for_user_operation(
        smart_account_address=smart_account_model.address,
        user_op_hash=mock_user_operation["hash"],
        timeout_seconds=30,
        interval_seconds=0.5,
    )

    mock_wait_for_user_operation.assert_called_once_with(
        client.api_clients,
        smart_account_model.address,
        mock_user_operation["hash"],
        30,
        0.5,
    )

    assert result == mock_wait_result


@pytest.mark.asyncio
async def test_sign_hash():
    """Test signing an EVM hash."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.sign_evm_hash = AsyncMock(return_value="0x123")
    client = EvmClient(api_clients=mock_api_clients)
    test_address = "0x1234567890123456789012345678901234567890"
    test_hash = "0xabcdef"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_hash(
        address=test_address, hash=test_hash, idempotency_key=test_idempotency_key
    )

    mock_evm_accounts_api.sign_evm_hash.assert_called_once_with(
        address=test_address,
        sign_evm_hash_request=SignEvmHashRequest(hash=test_hash),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_sign_message():
    """Test signing an EVM message."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.sign_evm_message = AsyncMock(return_value="0x123")
    client = EvmClient(api_clients=mock_api_clients)
    test_address = "0x1234567890123456789012345678901234567890"
    test_message = "0xabcdef"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_message(
        address=test_address, message=test_message, idempotency_key=test_idempotency_key
    )

    mock_evm_accounts_api.sign_evm_message.assert_called_once_with(
        address=test_address,
        sign_evm_message_request=SignEvmMessageRequest(message=test_message),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_sign_transaction():
    """Test signing an EVM transaction."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.sign_evm_transaction = AsyncMock(return_value="0x123")
    client = EvmClient(api_clients=mock_api_clients)
    test_address = "0x1234567890123456789012345678901234567890"
    test_transaction = "0xabcdef"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_transaction(
        address=test_address,
        transaction=test_transaction,
        idempotency_key=test_idempotency_key,
    )

    mock_evm_accounts_api.sign_evm_transaction.assert_called_once_with(
        address=test_address,
        sign_evm_transaction_request=SignEvmTransactionRequest(
            transaction=test_transaction
        ),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_request_faucet():
    """Test requesting an EVM faucet."""
    mock_faucets_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.faucets = mock_faucets_api

    mock_response = AsyncMock()
    mock_response.transaction_hash = "0xfaucet_tx_hash"
    mock_faucets_api.request_evm_faucet = AsyncMock(return_value=mock_response)

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_network = "base-sepolia"
    test_token = "eth"
    result = await client.request_faucet(
        address=test_address,
        network=test_network,
        token=test_token,
    )

    mock_faucets_api.request_evm_faucet.assert_called_once_with(
        request_evm_faucet_request=RequestEvmFaucetRequest(
            address=test_address, network=test_network, token=test_token
        )
    )

    assert result == "0xfaucet_tx_hash"


@pytest.mark.asyncio
async def test_get_smart_account(smart_account_model_factory):
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    evm_smart_account_model = smart_account_model_factory()
    mock_evm_smart_accounts_api.get_evm_smart_account = AsyncMock(
        return_value=evm_smart_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    mock_owner = AsyncMock()
    mock_owner.address = "0x0987654321098765432109876543210987654321"

    result = await client.get_smart_account(address=test_address, owner=mock_owner)

    mock_evm_smart_accounts_api.get_evm_smart_account.assert_called_once_with(
        test_address
    )

    assert result.address == evm_smart_account_model.address
    assert result.name == evm_smart_account_model.name
    assert result.owners == [mock_owner]


@pytest.mark.asyncio
async def test_list_smart_accounts():
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    mock_account_1 = AsyncMock()
    mock_account_1.address = "0x1234567890123456789012345678901234567890"
    mock_account_1.name = "test-smart-account-1"
    mock_account_2 = AsyncMock()
    mock_account_2.address = "0x2345678901234567890123456789012345678901"
    mock_account_2.name = "test-smart-account-2"

    mock_response = AsyncMock()
    mock_response.accounts = [mock_account_1, mock_account_2]
    mock_response.next_page_token = "next-page-token"
    mock_evm_smart_accounts_api.list_evm_smart_accounts = AsyncMock(
        return_value=mock_response
    )

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.list_smart_accounts(page_size=10, page_token="page-token")

    mock_evm_smart_accounts_api.list_evm_smart_accounts.assert_called_once_with(
        page_size=10, page_token="page-token"
    )

    assert len(result["evm_smart_accounts"]) == 2
    assert result["evm_smart_accounts"][0] == mock_account_1
    assert result["evm_smart_accounts"][1] == mock_account_2
    assert result["next_page_token"] == "next-page-token"


@pytest.mark.asyncio
async def test_prepare_user_operation():
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    mock_smart_account = AsyncMock()
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"
    mock_owner = AsyncMock()
    mock_owner.address = "0x0987654321098765432109876543210987654321"
    mock_smart_account.owner = mock_owner

    from cdp.evm_call_types import EncodedCall

    mock_calls = [
        EncodedCall(
            to="0x1234567890123456789012345678901234567890",
            data="0xabcdef",
            value="1000000000000000000",
        ),
        EncodedCall(
            to="0x4567890123456789012345678901234567890123", data="0x123456", value=None
        ),
    ]

    mock_user_operation = AsyncMock()
    mock_user_operation.userOpHash = "0x789"
    mock_user_operation.network = "base-sepolia"
    mock_user_operation.calls = [AsyncMock(), AsyncMock()]
    mock_user_operation.status = "pending"

    mock_evm_smart_accounts_api.prepare_user_operation = AsyncMock(
        return_value=mock_user_operation
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_network = "base-sepolia"
    test_paymaster_url = "https://paymaster.example.com"

    result = await client.prepare_user_operation(
        smart_account=mock_smart_account,
        calls=mock_calls,
        network=test_network,
        paymaster_url=test_paymaster_url,
    )

    mock_evm_smart_accounts_api.prepare_user_operation.assert_called_once()
    call_args = mock_evm_smart_accounts_api.prepare_user_operation.call_args
    assert call_args[0][0] == mock_smart_account.address

    request_obj = call_args[0][1]
    assert request_obj.network == test_network
    assert request_obj.paymaster_url == test_paymaster_url

    assert len(request_obj.calls) == 2
    assert request_obj.calls[0].to == "0x1234567890123456789012345678901234567890"
    assert request_obj.calls[0].data == "0xabcdef"
    assert request_obj.calls[0].value == "1000000000000000000"
    assert request_obj.calls[1].to == "0x4567890123456789012345678901234567890123"
    assert request_obj.calls[1].data == "0x123456"
    assert request_obj.calls[1].value == "0"

    assert result == mock_user_operation


@pytest.mark.asyncio
async def test_get_user_operation():
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    mock_user_operation = AsyncMock()
    mock_user_operation.userOpHash = "0x789"
    mock_user_operation.network = "ethereum"
    mock_user_operation.calls = [AsyncMock(), AsyncMock()]
    mock_user_operation.status = "pending"

    mock_evm_smart_accounts_api.get_user_operation = AsyncMock(
        return_value=mock_user_operation
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_user_op_hash = "0x789"

    result = await client.get_user_operation(
        address=test_address, user_op_hash=test_user_op_hash
    )

    mock_evm_smart_accounts_api.get_user_operation.assert_called_once_with(
        test_address, test_user_op_hash
    )

    assert result == mock_user_operation
