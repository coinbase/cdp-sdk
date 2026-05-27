import { CdpOpenApiClientType } from "../../openapi-client/index.js";

/**
 * The supported wallet transaction webhook event types.
 */
export type WebhookEventType =
  | "wallet.transaction.created"
  | "wallet.transaction.broadcast"
  | "wallet.transaction.pending"
  | "wallet.transaction.replaced"
  | "wallet.transaction.confirmed"
  | "wallet.transaction.failed"
  | "wallet.transaction.signed"
  | "wallet.typed_data.signed"
  | "wallet.message.signed"
  | "wallet.hash.signed"
  | "wallet.delegation.created"
  | "wallet.delegation.revoked";

/**
 * Options for creating a webhook subscription.
 */
export interface CreateWebhookSubscriptionOptions {
  /** A description of the webhook subscription. */
  description?: string;
  /** The event types to subscribe to. */
  eventTypes: WebhookEventType[];
  /** The URL to deliver webhook events to. */
  targetUrl: string;
  /** Additional headers to include in webhook requests. */
  targetHeaders?: Record<string, string>;
  /** Whether the subscription is enabled. Defaults to `true`. */
  isEnabled?: boolean;
  /** Additional metadata for the subscription. */
  metadata?: Record<string, string>;
}

/**
 * The result of creating a webhook subscription.
 */
export interface CreateWebhookSubscriptionResult {
  /** The unique identifier for the subscription. */
  subscriptionId: string;
  /** The description of the webhook subscription. */
  description?: string;
  /** The event types the subscription is subscribed to. */
  eventTypes: string[];
  /** The webhook URL events are delivered to. */
  targetUrl: string;
  /** Additional headers included in webhook requests. */
  targetHeaders?: Record<string, string>;
  /** Whether the subscription is enabled. */
  isEnabled: boolean;
  /** Secret for webhook signature verification. */
  secret: string;
  /** When the subscription was created. */
  createdAt: string;
  /** When the subscription was last updated. */
  updatedAt?: string;
}

/**
 * Creates a webhook subscription for wallet transaction events.
 *
 * @param client - The CDP OpenAPI client.
 * @param options - The options for creating the webhook subscription.
 * @returns The created webhook subscription.
 *
 * @example
 * ```ts
 * const subscription = await createWebhookSubscription(client, {
 *   description: "Monitor wallet transactions",
 *   eventTypes: [
 *     "wallet.transaction.pending",
 *     "wallet.transaction.confirmed",
 *     "wallet.transaction.failed",
 *   ],
 *   targetUrl: "https://example.com/webhook",
 *   isEnabled: true,
 * });
 * ```
 */
export async function createWebhookSubscription(
  client: CdpOpenApiClientType,
  options: CreateWebhookSubscriptionOptions,
): Promise<CreateWebhookSubscriptionResult> {
  const response = await client.createWebhookSubscription({
    description: options.description,
    eventTypes: options.eventTypes,
    target: {
      url: options.targetUrl,
      headers: options.targetHeaders,
    },
    isEnabled: options.isEnabled ?? true,
    metadata: options.metadata,
  });

  return {
    subscriptionId: response.subscriptionId,
    description: response.description,
    eventTypes: response.eventTypes,
    targetUrl: response.target.url,
    targetHeaders: response.target.headers,
    isEnabled: response.isEnabled,
    secret: response.secret,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}
