"""Tests for End User Client functionality."""

from unittest.mock import AsyncMock, patch

import pytest

from cdp.api_clients import ApiClients
from cdp.end_user_client import EndUserClient
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.models.authentication_method import AuthenticationMethod
from cdp.openapi_client.models.create_end_user_request_evm_account import (
    CreateEndUserRequestEvmAccount,
)
from cdp.openapi_client.models.create_end_user_request_solana_account import (
    CreateEndUserRequestSolanaAccount,
)
from cdp.openapi_client.models.email_authentication import EmailAuthentication


def test_init():
    """Test the initialization of the EndUserClient."""
    client = EndUserClient(
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
async def test_validate_access_token_success(end_user_model_factory):
    """Test successful access token validation."""
    mock_access_token = "aaa.bbb.ccc"
    mock_end_user_id = "1234567890"
    mock_end_user_model = end_user_model_factory(user_id=mock_end_user_id)
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.validate_end_user_access_token = AsyncMock(
        return_value=mock_end_user_model
    )

    client = EndUserClient(api_clients=mock_api_clients)

    end_user = await client.validate_access_token(access_token=mock_access_token)
    assert end_user.user_id == mock_end_user_id


@pytest.mark.asyncio
async def test_validate_access_token_missing_access_token(end_user_model_factory):
    """Test missing access token."""
    mock_access_token = None
    mock_end_user_id = "1234567890"
    mock_end_user_model = end_user_model_factory(user_id=mock_end_user_id)
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.validate_end_user_access_token = AsyncMock(
        return_value=mock_end_user_model
    )

    client = EndUserClient(api_clients=mock_api_clients)

    with pytest.raises(ValueError, match="Input should be a valid string"):
        await client.validate_access_token(access_token=mock_access_token)


@pytest.mark.asyncio
async def test_list_end_users_success(end_user_model_factory, list_end_users_response_factory):
    """Test successful end users listing."""
    mock_end_user_1 = end_user_model_factory(user_id="user1")
    mock_end_user_2 = end_user_model_factory(user_id="user2")
    mock_response = list_end_users_response_factory(
        end_users=[mock_end_user_1, mock_end_user_2], next_page_token="next_page_token"
    )

    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.list_end_users = AsyncMock(return_value=mock_response)

    client = EndUserClient(api_clients=mock_api_clients)

    result = await client.list_end_users()

    assert len(result.end_users) == 2
    assert result.end_users[0].user_id == "user1"
    assert result.end_users[1].user_id == "user2"
    assert result.next_page_token == "next_page_token"


@pytest.mark.asyncio
async def test_list_end_users_with_pagination(
    end_user_model_factory, list_end_users_response_factory
):
    """Test end users listing with pagination parameters."""
    mock_end_user = end_user_model_factory(user_id="user1")
    mock_response = list_end_users_response_factory(end_users=[mock_end_user], next_page_token=None)

    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.list_end_users = AsyncMock(return_value=mock_response)

    client = EndUserClient(api_clients=mock_api_clients)

    result = await client.list_end_users(page_size=10, page_token="token123")

    assert len(result.end_users) == 1
    assert result.end_users[0].user_id == "user1"
    assert result.next_page_token is None

    # Verify the method was called with correct parameters
    mock_api_clients.end_user.list_end_users.assert_called_once_with(
        page_size=10, page_token="token123", sort=None
    )


@pytest.mark.asyncio
async def test_list_end_users_with_sort(end_user_model_factory, list_end_users_response_factory):
    """Test end users listing with sort parameter."""
    mock_end_user = end_user_model_factory(user_id="user1")
    mock_response = list_end_users_response_factory(end_users=[mock_end_user], next_page_token=None)

    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.list_end_users = AsyncMock(return_value=mock_response)

    client = EndUserClient(api_clients=mock_api_clients)

    result = await client.list_end_users(sort=["createdAt=desc"])

    assert len(result.end_users) == 1
    assert result.end_users[0].user_id == "user1"

    # Verify the method was called with correct parameters
    mock_api_clients.end_user.list_end_users.assert_called_once_with(
        page_size=None, page_token=None, sort=["createdAt=desc"]
    )


@pytest.mark.asyncio
async def test_create_end_user_with_provided_user_id(end_user_model_factory):
    """Test creating an end user with a provided user_id."""
    mock_user_id = "custom-user-id"
    mock_end_user_model = end_user_model_factory(user_id=mock_user_id)
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.create_end_user = AsyncMock(return_value=mock_end_user_model)

    client = EndUserClient(api_clients=mock_api_clients)

    auth_method = AuthenticationMethod(EmailAuthentication(type="email", email="test@example.com"))
    end_user = await client.create_end_user(
        authentication_methods=[auth_method],
        user_id=mock_user_id,
    )

    assert end_user.user_id == mock_user_id
    mock_api_clients.end_user.create_end_user.assert_called_once()
    call_args = mock_api_clients.end_user.create_end_user.call_args
    request = call_args.kwargs["create_end_user_request"]
    assert request.user_id == mock_user_id


@pytest.mark.asyncio
async def test_create_end_user_generates_uuid_if_not_provided(end_user_model_factory):
    """Test that a UUID is generated if user_id is not provided."""
    generated_uuid = "generated-uuid-1234"
    mock_end_user_model = end_user_model_factory(user_id=generated_uuid)
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.create_end_user = AsyncMock(return_value=mock_end_user_model)

    client = EndUserClient(api_clients=mock_api_clients)

    auth_method = AuthenticationMethod(EmailAuthentication(type="email", email="test@example.com"))

    with patch("cdp.end_user_client.uuid.uuid4") as mock_uuid:
        mock_uuid.return_value = generated_uuid
        await client.create_end_user(
            authentication_methods=[auth_method],
        )

    mock_uuid.assert_called_once()
    call_args = mock_api_clients.end_user.create_end_user.call_args
    request = call_args.kwargs["create_end_user_request"]
    assert request.user_id == generated_uuid


@pytest.mark.asyncio
async def test_create_end_user_with_evm_account(end_user_model_factory):
    """Test creating an end user with an EVM account option."""
    mock_end_user_model = end_user_model_factory(user_id="test-user")
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.create_end_user = AsyncMock(return_value=mock_end_user_model)

    client = EndUserClient(api_clients=mock_api_clients)

    auth_method = AuthenticationMethod(EmailAuthentication(type="email", email="test@example.com"))
    evm_account = CreateEndUserRequestEvmAccount(create_smart_account=True)

    with patch("cdp.end_user_client.uuid.uuid4") as mock_uuid:
        mock_uuid.return_value = "generated-uuid"
        await client.create_end_user(
            authentication_methods=[auth_method],
            evm_account=evm_account,
        )

    call_args = mock_api_clients.end_user.create_end_user.call_args
    request = call_args.kwargs["create_end_user_request"]
    assert request.evm_account == evm_account
    assert request.evm_account.create_smart_account is True


@pytest.mark.asyncio
async def test_create_end_user_with_solana_account(end_user_model_factory):
    """Test creating an end user with a Solana account option."""
    mock_end_user_model = end_user_model_factory(user_id="test-user")
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.create_end_user = AsyncMock(return_value=mock_end_user_model)

    client = EndUserClient(api_clients=mock_api_clients)

    auth_method = AuthenticationMethod(EmailAuthentication(type="email", email="test@example.com"))
    solana_account = CreateEndUserRequestSolanaAccount(create_smart_account=False)

    with patch("cdp.end_user_client.uuid.uuid4") as mock_uuid:
        mock_uuid.return_value = "generated-uuid"
        await client.create_end_user(
            authentication_methods=[auth_method],
            solana_account=solana_account,
        )

    call_args = mock_api_clients.end_user.create_end_user.call_args
    request = call_args.kwargs["create_end_user_request"]
    assert request.solana_account == solana_account
    assert request.solana_account.create_smart_account is False


@pytest.mark.asyncio
async def test_create_end_user_with_evm_account_and_spend_permissions(end_user_model_factory):
    """Test creating an end user with an EVM account and spend permissions enabled."""
    mock_end_user_model = end_user_model_factory(user_id="test-user")
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.create_end_user = AsyncMock(return_value=mock_end_user_model)

    client = EndUserClient(api_clients=mock_api_clients)

    auth_method = AuthenticationMethod(EmailAuthentication(type="email", email="test@example.com"))
    evm_account = CreateEndUserRequestEvmAccount(
        create_smart_account=True, enable_spend_permissions=True
    )

    with patch("cdp.end_user_client.uuid.uuid4") as mock_uuid:
        mock_uuid.return_value = "generated-uuid"
        await client.create_end_user(
            authentication_methods=[auth_method],
            evm_account=evm_account,
        )

    call_args = mock_api_clients.end_user.create_end_user.call_args
    request = call_args.kwargs["create_end_user_request"]
    assert request.evm_account == evm_account
    assert request.evm_account.create_smart_account is True
    assert request.evm_account.enable_spend_permissions is True


@pytest.mark.asyncio
async def test_create_end_user_handles_error():
    """Test that errors are propagated when creating an end user."""
    mock_api_clients = AsyncMock()
    expected_error = Exception("API Error: Invalid authentication method")
    mock_api_clients.end_user.create_end_user = AsyncMock(side_effect=expected_error)

    client = EndUserClient(api_clients=mock_api_clients)

    auth_method = AuthenticationMethod(EmailAuthentication(type="email", email="test@example.com"))

    with patch("cdp.end_user_client.uuid.uuid4") as mock_uuid:
        mock_uuid.return_value = "generated-uuid"
        with pytest.raises(Exception, match="API Error: Invalid authentication method"):
            await client.create_end_user(
                authentication_methods=[auth_method],
            )
