from cdp.openapi_client.api.webhooks_api import WebhooksApi
from cdp.openapi_client.models.webhook_subscription_request import WebhookSubscriptionRequest
from cdp.openapi_client.models.webhook_target import WebhookTarget
from cdp.webhook_types import (
    CreateWebhookSubscriptionOptions,
    CreateWebhookSubscriptionResult,
)


async def create_webhook_subscription(
    webhooks_api: WebhooksApi,
    options: CreateWebhookSubscriptionOptions,
) -> CreateWebhookSubscriptionResult:
    """Create a webhook subscription for wallet transaction events.

    Args:
        webhooks_api (WebhooksApi): The webhooks API client.
        options (CreateWebhookSubscriptionOptions): The options for creating the webhook subscription.

    Returns:
        CreateWebhookSubscriptionResult: The created webhook subscription.

    """
    response = await webhooks_api.create_webhook_subscription(
        webhook_subscription_request=WebhookSubscriptionRequest(
            description=options.description,
            event_types=list(options.event_types),
            target=WebhookTarget(
                url=options.target_url,
                headers=options.target_headers,
            ),
            is_enabled=options.is_enabled if options.is_enabled is not None else True,
            metadata=options.metadata,
        ),
    )

    return CreateWebhookSubscriptionResult(
        subscription_id=response.subscription_id,
        description=response.description,
        event_types=list(response.event_types),
        target_url=response.target.url,
        target_headers=response.target.headers,
        is_enabled=response.is_enabled,
        secret=response.secret,
        created_at=str(response.created_at),
        updated_at=str(response.updated_at)
        if hasattr(response, "updated_at") and response.updated_at is not None
        else None,
    )
