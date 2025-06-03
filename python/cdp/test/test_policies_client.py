from unittest.mock import AsyncMock

import pytest

from cdp.api_clients import ApiClients
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest
from cdp.openapi_client.models.list_policies200_response import ListPolicies200Response
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest
from cdp.policies.request_transformer import map_request_rules_to_openapi_format
from cdp.policies.types import (
    CreatePolicyOptions,
    UpdatePolicyOptions,
)
from cdp.policies_client import PoliciesClient


def test_init():
    """Test the initialization of the EvmClient."""
    client = PoliciesClient(
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
async def test_create_policy(openapi_policy_model_factory, policy_model_factory):
    """Test the creation of a policy."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope=policy_model.scope,
        description=policy_model.description,
        rules=policy_model.rules,
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=policy_model.scope,
            description=policy_model.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_update_policy(openapi_policy_model_factory, policy_model_factory):
    """Test the update of a policy."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.update_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    update_options = UpdatePolicyOptions(
        description=policy_model.description,
        rules=policy_model.rules,
    )

    result = await client.update_policy(openapi_policy_model.id, update_options)

    mock_policies_api.update_policy.assert_called_once_with(
        policy_id=openapi_policy_model.id,
        update_policy_request=UpdatePolicyRequest(
            description=policy_model.description,
            rules=map_request_rules_to_openapi_format(update_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id == policy_model.id
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_delete_policy():
    """Test the deletion of a policy."""
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.delete_policy = AsyncMock(return_value=None)

    client = PoliciesClient(api_clients=mock_api_clients)

    result = await client.delete_policy("123")

    mock_policies_api.delete_policy.assert_called_once_with(
        policy_id="123",
        x_idempotency_key=None,
    )
    assert result is None


@pytest.mark.asyncio
async def test_get_policy_by_id(openapi_policy_model_factory, policy_model_factory):
    """Test the retrieval of a policy by ID."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.get_policy_by_id = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    result = await client.get_policy_by_id(openapi_policy_model.id)

    mock_policies_api.get_policy_by_id.assert_called_once_with(policy_id=openapi_policy_model.id)
    assert result.id == policy_model.id
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_list_policies(openapi_policy_model_factory, policy_model_factory):
    """Test the listing of policies."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.list_policies = AsyncMock(
        return_value=ListPolicies200Response(
            policies=[openapi_policy_model],
            next_page_token=None,
        )
    )

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    # Test without scope
    result = await client.list_policies()

    mock_policies_api.list_policies.assert_called_with(
        page_size=None,
        page_token=None,
        scope=None,
    )
    assert result.policies == [policy_model]
    assert result.next_page_token is None

    # Test with scope
    result = await client.list_policies(scope="account")

    mock_policies_api.list_policies.assert_called_with(
        page_size=None,
        page_token=None,
        scope="account",
    )
    assert result.policies == [policy_model]
    assert result.next_page_token is None
