from cdp.actions.webhooks.create_webhook_subscription import create_webhook_subscription
from cdp.analytics import track_action, track_error
from cdp.api_clients import ApiClients
from cdp.webhook_types import (
    CreateWebhookSubscriptionOptions,
    CreateWebhookSubscriptionResult,
)


class WebhooksClient:
    """Client for managing webhook subscriptions."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def create_subscription(
        self,
        options: CreateWebhookSubscriptionOptions,
    ) -> CreateWebhookSubscriptionResult:
        """Create a webhook subscription for wallet transaction events.

        Args:
            options (CreateWebhookSubscriptionOptions): The options for creating the webhook subscription.

        Returns:
            CreateWebhookSubscriptionResult: The created webhook subscription.

        Example:
            .. code-block:: python

                from cdp import CdpClient
                from cdp.webhook_types import CreateWebhookSubscriptionOptions

                async with CdpClient() as cdp:
                    subscription = await cdp.webhooks.create_subscription(
                        CreateWebhookSubscriptionOptions(
                            event_types=[
                                "wallet.transaction.pending",
                                "wallet.transaction.confirmed",
                                "wallet.transaction.failed",
                            ],
                            target_url="https://example.com/webhook",
                            description="Monitor wallet transactions",
                        )
                    )

                    print("Subscription ID:", subscription.subscription_id)
                    print("Secret:", subscription.secret)

        """
        track_action(action="create_webhook_subscription")

        try:
            return await create_webhook_subscription(
                webhooks_api=self.api_clients.webhooks,
                options=options,
            )
        except Exception as error:
            track_error(error, "create_webhook_subscription")
            raise
