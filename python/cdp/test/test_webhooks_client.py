from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from cdp.api_clients import ApiClients
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.models.webhook_subscription_request import WebhookSubscriptionRequest
from cdp.openapi_client.models.webhook_subscription_response import WebhookSubscriptionResponse
from cdp.openapi_client.models.webhook_target import WebhookTarget as OpenApiWebhookTarget
from cdp.webhook_types import CreateWebhookSubscriptionOptions
from cdp.webhooks_client import WebhooksClient


def test_init():
    """Test the initialization of the WebhooksClient."""
    client = WebhooksClient(
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
async def test_create_subscription_with_required_fields():
    """Test creating a webhook subscription with only required fields."""
    mock_response = WebhookSubscriptionResponse(
        subscription_id="sub_123",
        event_types=["wallet.transaction.confirmed"],
        target=OpenApiWebhookTarget(url="https://example.com/webhook"),
        is_enabled=True,
        secret="whsec_test_secret",
        created_at=datetime(2026, 4, 1, 0, 0, 0),
    )

    mock_webhooks_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.webhooks = mock_webhooks_api
    mock_webhooks_api.create_webhook_subscription = AsyncMock(return_value=mock_response)

    client = WebhooksClient(api_clients=mock_api_clients)

    options = CreateWebhookSubscriptionOptions(
        event_types=["wallet.transaction.confirmed"],
        target_url="https://example.com/webhook",
    )

    result = await client.create_subscription(options)

    mock_webhooks_api.create_webhook_subscription.assert_called_once_with(
        webhook_subscription_request=WebhookSubscriptionRequest(
            description=None,
            event_types=["wallet.transaction.confirmed"],
            target=OpenApiWebhookTarget(
                url="https://example.com/webhook",
                headers=None,
            ),
            is_enabled=True,
            metadata=None,
        ),
    )

    assert result.subscription_id == "sub_123"
    assert result.event_types == ["wallet.transaction.confirmed"]
    assert result.target_url == "https://example.com/webhook"
    assert result.target_headers is None
    assert result.is_enabled is True
    assert result.secret == "whsec_test_secret"
    assert result.description is None


@pytest.mark.asyncio
async def test_create_subscription_with_all_optional_fields():
    """Test creating a webhook subscription with all optional fields."""
    mock_response = WebhookSubscriptionResponse(
        subscription_id="sub_456",
        description="Monitor wallet transactions",
        event_types=[
            "wallet.transaction.pending",
            "wallet.transaction.confirmed",
            "wallet.transaction.failed",
        ],
        target=OpenApiWebhookTarget(
            url="https://example.com/webhook",
            headers={"X-Custom-Header": "custom-value"},
        ),
        is_enabled=False,
        secret="whsec_another_secret",
        created_at=datetime(2026, 4, 1, 0, 0, 0),
    )

    mock_webhooks_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.webhooks = mock_webhooks_api
    mock_webhooks_api.create_webhook_subscription = AsyncMock(return_value=mock_response)

    client = WebhooksClient(api_clients=mock_api_clients)

    options = CreateWebhookSubscriptionOptions(
        description="Monitor wallet transactions",
        event_types=[
            "wallet.transaction.pending",
            "wallet.transaction.confirmed",
            "wallet.transaction.failed",
        ],
        target_url="https://example.com/webhook",
        target_headers={"X-Custom-Header": "custom-value"},
        is_enabled=False,
        metadata={"env": "production"},
    )

    result = await client.create_subscription(options)

    mock_webhooks_api.create_webhook_subscription.assert_called_once_with(
        webhook_subscription_request=WebhookSubscriptionRequest(
            description="Monitor wallet transactions",
            event_types=[
                "wallet.transaction.pending",
                "wallet.transaction.confirmed",
                "wallet.transaction.failed",
            ],
            target=OpenApiWebhookTarget(
                url="https://example.com/webhook",
                headers={"X-Custom-Header": "custom-value"},
            ),
            is_enabled=False,
            metadata={"env": "production"},
        ),
    )

    assert result.subscription_id == "sub_456"
    assert result.description == "Monitor wallet transactions"
    assert result.event_types == [
        "wallet.transaction.pending",
        "wallet.transaction.confirmed",
        "wallet.transaction.failed",
    ]
    assert result.target_url == "https://example.com/webhook"
    assert result.target_headers == {"X-Custom-Header": "custom-value"}
    assert result.is_enabled is False
    assert result.secret == "whsec_another_secret"


@pytest.mark.asyncio
async def test_create_subscription_defaults_is_enabled_to_true():
    """Test that isEnabled defaults to true when not provided."""
    mock_response = WebhookSubscriptionResponse(
        subscription_id="sub_789",
        event_types=["wallet.transaction.created"],
        target=OpenApiWebhookTarget(url="https://example.com/webhook"),
        is_enabled=True,
        secret="whsec_default_secret",
        created_at=datetime(2026, 4, 1, 0, 0, 0),
    )

    mock_webhooks_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.webhooks = mock_webhooks_api
    mock_webhooks_api.create_webhook_subscription = AsyncMock(return_value=mock_response)

    client = WebhooksClient(api_clients=mock_api_clients)

    options = CreateWebhookSubscriptionOptions(
        event_types=["wallet.transaction.created"],
        target_url="https://example.com/webhook",
    )

    await client.create_subscription(options)

    call_args = mock_webhooks_api.create_webhook_subscription.call_args
    request = call_args.kwargs["webhook_subscription_request"]
    assert request.is_enabled is True


@pytest.mark.asyncio
async def test_create_subscription_handles_all_seven_event_types():
    """Test that all seven wallet transaction event types are handled."""
    all_event_types = [
        "wallet.transaction.created",
        "wallet.transaction.broadcast",
        "wallet.transaction.pending",
        "wallet.transaction.replaced",
        "wallet.transaction.confirmed",
        "wallet.transaction.failed",
        "wallet.transaction.signed",
    ]

    mock_response = WebhookSubscriptionResponse(
        subscription_id="sub_all",
        event_types=all_event_types,
        target=OpenApiWebhookTarget(url="https://example.com/webhook"),
        is_enabled=True,
        secret="whsec_all_events",
        created_at=datetime(2026, 4, 1, 0, 0, 0),
    )

    mock_webhooks_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.webhooks = mock_webhooks_api
    mock_webhooks_api.create_webhook_subscription = AsyncMock(return_value=mock_response)

    client = WebhooksClient(api_clients=mock_api_clients)

    options = CreateWebhookSubscriptionOptions(
        event_types=all_event_types,
        target_url="https://example.com/webhook",
    )

    result = await client.create_subscription(options)

    assert len(result.event_types) == 7
    assert result.event_types == all_event_types


@pytest.mark.asyncio
async def test_create_subscription_propagates_api_errors():
    """Test that API errors are propagated."""
    mock_webhooks_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.webhooks = mock_webhooks_api
    mock_webhooks_api.create_webhook_subscription = AsyncMock(
        side_effect=Exception("API request failed")
    )

    client = WebhooksClient(api_clients=mock_api_clients)

    options = CreateWebhookSubscriptionOptions(
        event_types=["wallet.transaction.confirmed"],
        target_url="https://example.com/webhook",
    )

    with pytest.raises(Exception, match="API request failed"):
        await client.create_subscription(options)


@pytest.mark.asyncio
async def test_create_subscription_maps_target_url_and_headers():
    """Test that target_url and target_headers are correctly mapped to the nested target object."""
    mock_response = WebhookSubscriptionResponse(
        subscription_id="sub_mapping",
        event_types=["wallet.transaction.confirmed"],
        target=OpenApiWebhookTarget(
            url="https://example.com/webhook",
            headers={"Authorization": "Bearer token123"},
        ),
        is_enabled=True,
        secret="whsec_mapping_secret",
        created_at=datetime(2026, 4, 1, 0, 0, 0),
    )

    mock_webhooks_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.webhooks = mock_webhooks_api
    mock_webhooks_api.create_webhook_subscription = AsyncMock(return_value=mock_response)

    client = WebhooksClient(api_clients=mock_api_clients)

    options = CreateWebhookSubscriptionOptions(
        event_types=["wallet.transaction.confirmed"],
        target_url="https://example.com/webhook",
        target_headers={"Authorization": "Bearer token123"},
    )

    await client.create_subscription(options)

    call_args = mock_webhooks_api.create_webhook_subscription.call_args
    request = call_args.kwargs["webhook_subscription_request"]
    assert request.target.url == "https://example.com/webhook"
    assert request.target.headers == {"Authorization": "Bearer token123"}
