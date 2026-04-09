/**
 * @module Client
 */

import {
  createWebhookSubscription,
  CreateWebhookSubscriptionOptions,
  CreateWebhookSubscriptionResult,
} from "../../actions/webhooks/createWebhookSubscription.js";
import { Analytics } from "../../analytics.js";
import { CdpOpenApiClient } from "../../openapi-client/index.js";

/**
 * The namespace containing all webhook methods.
 */
export class WebhooksClient {
  /**
   * Creates a webhook subscription for wallet transaction events.
   *
   * @param {CreateWebhookSubscriptionOptions} options - Parameters for creating the webhook subscription.
   * @param {string} [options.description] - A description of the webhook subscription.
   * @param {WebhookEventType[]} options.eventTypes - The event types to subscribe to.
   * @param {string} options.targetUrl - The URL to deliver webhook events to.
   * @param {Record<string, string>} [options.targetHeaders] - Additional headers to include in webhook requests.
   * @param {boolean} [options.isEnabled] - Whether the subscription is enabled. Defaults to `true`.
   * @param {Record<string, string>} [options.metadata] - Additional metadata for the subscription.
   *
   * @returns A promise that resolves to the created webhook subscription.
   *
   * @example
   * ```ts
   * const subscription = await cdp.webhooks.createSubscription({
   *   description: "Monitor wallet transactions",
   *   eventTypes: [
   *     "wallet.transaction.pending",
   *     "wallet.transaction.confirmed",
   *     "wallet.transaction.failed",
   *   ],
   *   targetUrl: "https://example.com/webhook",
   *   isEnabled: true,
   * });
   *
   * console.log("Subscription ID:", subscription.subscriptionId);
   * console.log("Secret:", subscription.secret);
   * ```
   */
  async createSubscription(
    options: CreateWebhookSubscriptionOptions,
  ): Promise<CreateWebhookSubscriptionResult> {
    Analytics.trackAction({
      action: "create_webhook_subscription",
    });

    try {
      return await createWebhookSubscription(CdpOpenApiClient, options);
    } catch (error) {
      Analytics.trackError(error, "createWebhookSubscription");
      throw error;
    }
  }
}
