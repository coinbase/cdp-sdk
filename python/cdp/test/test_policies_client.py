from unittest.mock import AsyncMock

import pytest

from cdp.api_clients import ApiClients
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest
from cdp.policies.types import (
    CreatePolicyOptions,
    EvmAddressCriterion,
    ListPoliciesResult,
    SignEvmTransactionRule,
    UpdatePolicyOptions,
)
from cdp.policies.utils import map_policy_rules_to_openapi_format
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
async def test_create_policy(policy_model_factory):
    """Test the creation of a policy."""
    policy_model = policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=policy_model)

    client = PoliciesClient(api_clients=mock_api_clients)

    policy = CreatePolicyOptions(
        scope="account",
        description="create",
        rules=[
            SignEvmTransactionRule(
                action="accept",
                criteria=[
                    EvmAddressCriterion(
                        addresses=["0x000000000000000000000000000000000000dEaD"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(policy)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope="account",
            description="create",
            rules=map_policy_rules_to_openapi_format(policy.rules),
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
async def test_update_policy(policy_model_factory):
    """Test the update of a policy."""
    policy_model = policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.update_policy = AsyncMock(return_value=policy_model)

    client = PoliciesClient(api_clients=mock_api_clients)

    policy = UpdatePolicyOptions(
        description="update",
        rules=[
            SignEvmTransactionRule(
                action="accept",
                criteria=[
                    EvmAddressCriterion(
                        addresses=["0x000000000000000000000000000000000000dEaD"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.update_policy(policy_model.id, policy)

    mock_policies_api.update_policy.assert_called_once_with(
        policy_id=policy_model.id,
        update_policy_request=UpdatePolicyRequest(
            description="update",
            rules=map_policy_rules_to_openapi_format(policy.rules),
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
async def test_get_policy_by_id(policy_model_factory):
    """Test the retrieval of a policy by ID."""
    policy_model = policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.get_policy_by_id = AsyncMock(return_value=policy_model)

    client = PoliciesClient(api_clients=mock_api_clients)

    result = await client.get_policy_by_id(policy_model.id)

    mock_policies_api.get_policy_by_id.assert_called_once_with(policy_id=policy_model.id)
    assert result.id == policy_model.id
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_list_policies(policy_model_factory):
    """Test the listing of policies."""
    policy_model = policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.list_policies = AsyncMock(
        return_value=ListPoliciesResult(
            policies=[policy_model],
            next_page_token=None,
        )
    )

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
