import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import { CdpOpenApiClient } from "../../openapi-client/index.js";
import { createWebhookSubscription } from "../../actions/webhooks/createWebhookSubscription.js";
import type { CreateWebhookSubscriptionOptions } from "../../actions/webhooks/createWebhookSubscription.js";

import { WebhooksClient } from "./webhooks.js";

vi.mock("../../openapi-client/index.js", () => {
  return {
    CdpOpenApiClient: {
      createWebhookSubscription: vi.fn(),
    },
  };
});

vi.mock("../../actions/webhooks/createWebhookSubscription.js", () => ({
  createWebhookSubscription: vi.fn(),
}));

vi.mock("../../analytics.js", () => ({
  Analytics: {
    trackAction: vi.fn(),
    trackError: vi.fn(),
  },
}));

describe("WebhooksClient", () => {
  let client: WebhooksClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new WebhooksClient();
  });

  describe("createSubscription", () => {
    it("should create a webhook subscription with required fields", async () => {
      const mockResult = {
        subscriptionId: "sub_123",
        eventTypes: ["wallet.transaction.confirmed"],
        targetUrl: "https://example.com/webhook",
        isEnabled: true,
        secret: "whsec_test_secret",
        createdAt: "2026-04-01T00:00:00Z",
      };

      const createWebhookSubscriptionMock = createWebhookSubscription as MockedFunction<
        typeof createWebhookSubscription
      >;
      createWebhookSubscriptionMock.mockResolvedValue(mockResult);

      const options: CreateWebhookSubscriptionOptions = {
        eventTypes: ["wallet.transaction.confirmed"],
        targetUrl: "https://example.com/webhook",
      };

      const result = await client.createSubscription(options);

      expect(createWebhookSubscriptionMock).toHaveBeenCalledWith(CdpOpenApiClient, options);
      expect(result).toEqual(mockResult);
    });

    it("should create a webhook subscription with all optional fields", async () => {
      const mockResult = {
        subscriptionId: "sub_456",
        description: "Monitor wallet transactions",
        eventTypes: [
          "wallet.transaction.pending",
          "wallet.transaction.confirmed",
          "wallet.transaction.failed",
        ],
        targetUrl: "https://example.com/webhook",
        targetHeaders: { "X-Custom-Header": "custom-value" },
        isEnabled: false,
        secret: "whsec_another_secret",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-01T01:00:00Z",
      };

      const createWebhookSubscriptionMock = createWebhookSubscription as MockedFunction<
        typeof createWebhookSubscription
      >;
      createWebhookSubscriptionMock.mockResolvedValue(mockResult);

      const options: CreateWebhookSubscriptionOptions = {
        description: "Monitor wallet transactions",
        eventTypes: [
          "wallet.transaction.pending",
          "wallet.transaction.confirmed",
          "wallet.transaction.failed",
        ],
        targetUrl: "https://example.com/webhook",
        targetHeaders: { "X-Custom-Header": "custom-value" },
        isEnabled: false,
        metadata: { env: "production" },
      };

      const result = await client.createSubscription(options);

      expect(createWebhookSubscriptionMock).toHaveBeenCalledWith(CdpOpenApiClient, options);
      expect(result).toEqual(mockResult);
    });

    it("should propagate errors from the action", async () => {
      const mockError = new Error("API request failed");

      const createWebhookSubscriptionMock = createWebhookSubscription as MockedFunction<
        typeof createWebhookSubscription
      >;
      createWebhookSubscriptionMock.mockRejectedValue(mockError);

      const options: CreateWebhookSubscriptionOptions = {
        eventTypes: ["wallet.transaction.confirmed"],
        targetUrl: "https://example.com/webhook",
      };

      await expect(client.createSubscription(options)).rejects.toThrow("API request failed");
    });

    it("should pass the CdpOpenApiClient to the action", async () => {
      const createWebhookSubscriptionMock = createWebhookSubscription as MockedFunction<
        typeof createWebhookSubscription
      >;
      createWebhookSubscriptionMock.mockResolvedValue({
        subscriptionId: "sub_789",
        eventTypes: ["wallet.transaction.created"],
        targetUrl: "https://example.com/webhook",
        isEnabled: true,
        secret: "whsec_test",
        createdAt: "2026-04-01T00:00:00Z",
      });

      const options: CreateWebhookSubscriptionOptions = {
        eventTypes: ["wallet.transaction.created"],
        targetUrl: "https://example.com/webhook",
      };

      await client.createSubscription(options);

      expect(createWebhookSubscriptionMock).toHaveBeenCalledTimes(1);
      expect(createWebhookSubscriptionMock.mock.calls[0][0]).toBe(CdpOpenApiClient);
    });
  });
});
