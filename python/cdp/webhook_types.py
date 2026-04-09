from typing import Literal

from pydantic import BaseModel, Field

WebhookEventType = Literal[
    "wallet.transaction.created",
    "wallet.transaction.broadcast",
    "wallet.transaction.pending",
    "wallet.transaction.replaced",
    "wallet.transaction.confirmed",
    "wallet.transaction.failed",
    "wallet.transaction.signed",
]
"""The supported wallet transaction webhook event types."""


class CreateWebhookSubscriptionOptions(BaseModel):
    """Options for creating a webhook subscription."""

    event_types: list[WebhookEventType] = Field(description="The event types to subscribe to.")
    target_url: str = Field(description="The URL to deliver webhook events to.")
    description: str | None = Field(
        default=None,
        description="A description of the webhook subscription.",
    )
    target_headers: dict[str, str] | None = Field(
        default=None,
        description="Additional headers to include in webhook requests.",
    )
    is_enabled: bool | None = Field(
        default=None,
        description="Whether the subscription is enabled. Defaults to True.",
    )
    metadata: dict[str, str] | None = Field(
        default=None,
        description="Additional metadata for the subscription.",
    )


class CreateWebhookSubscriptionResult(BaseModel):
    """The result of creating a webhook subscription."""

    subscription_id: str = Field(description="The unique identifier for the subscription.")
    event_types: list[str] = Field(description="The event types the subscription is subscribed to.")
    target_url: str = Field(description="The webhook URL events are delivered to.")
    target_headers: dict[str, str] | None = Field(
        default=None,
        description="Additional headers included in webhook requests.",
    )
    is_enabled: bool = Field(description="Whether the subscription is enabled.")
    secret: str = Field(description="Secret for webhook signature verification.")
    created_at: str = Field(description="When the subscription was created.")
    description: str | None = Field(
        default=None,
        description="The description of the webhook subscription.",
    )
    updated_at: str | None = Field(
        default=None,
        description="When the subscription was last updated.",
    )
