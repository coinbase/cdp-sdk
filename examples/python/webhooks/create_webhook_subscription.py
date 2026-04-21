# Usage: uv run python webhooks/create_webhook_subscription.py

import asyncio

from cdp import CdpClient
from cdp.webhook_types import CreateWebhookSubscriptionOptions
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        subscription = await cdp.webhooks.create_subscription(
            CreateWebhookSubscriptionOptions(
                description="Monitor wallet transactions",
                event_types=[
                    "wallet.transaction.pending",
                    "wallet.transaction.confirmed",
                    "wallet.transaction.failed",
                    "wallet.transaction.created",
                    "wallet.transaction.broadcast",
                    "wallet.transaction.replaced",
                    "wallet.transaction.signed",
                    "wallet.typed_data.signed",
                    "wallet.message.signed",
                    "wallet.hash.signed",
                    "wallet.delegation.created",
                    "wallet.delegation.revoked",
                ],
                target_url="https://example.com/webhook",
            )
        )

        print(f"Subscription ID: {subscription.subscription_id}")
        print(f"Event Types: {subscription.event_types}")
        print(f"Target URL: {subscription.target_url}")
        print(f"Enabled: {subscription.is_enabled}")
        print(f"Created At: {subscription.created_at}")


asyncio.run(main())
