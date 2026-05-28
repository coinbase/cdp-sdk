import { describe, expect, it, vi, beforeEach } from "vitest";

import { createWebhookSubscription } from "./createWebhookSubscription.js";

import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type {
  CreateWebhookSubscriptionOptions,
  WebhookEventType,
} from "./createWebhookSubscription.js";

describe("createWebhookSubscription", () => {
  let mockClient: CdpOpenApiClientType;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      createWebhookSubscription: vi.fn(),
    } as unknown as CdpOpenApiClientType;
  });

  it("should create a webhook subscription with required fields", async () => {
    const mockResponse = {
      subscriptionId: "sub_123",
      eventTypes: ["wallet.transaction.confirmed"],
      target: {
        url: "https://example.com/webhook",
      },
      isEnabled: true,
      secret: "whsec_test_secret",
      createdAt: "2026-04-01T00:00:00Z",
    };

    (mockClient.createWebhookSubscription as any).mockResolvedValue(mockResponse);

    const options: CreateWebhookSubscriptionOptions = {
      eventTypes: ["wallet.transaction.confirmed"],
      targetUrl: "https://example.com/webhook",
    };

    const result = await createWebhookSubscription(mockClient, options);

    expect(mockClient.createWebhookSubscription).toHaveBeenCalledWith({
      description: undefined,
      eventTypes: ["wallet.transaction.confirmed"],
      target: {
        url: "https://example.com/webhook",
        headers: undefined,
      },
      isEnabled: true,
      metadata: undefined,
    });

    expect(result).toEqual({
      subscriptionId: "sub_123",
      description: undefined,
      eventTypes: ["wallet.transaction.confirmed"],
      targetUrl: "https://example.com/webhook",
      targetHeaders: undefined,
      isEnabled: true,
      secret: "whsec_test_secret",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: undefined,
    });
  });

  it("should create a webhook subscription with all optional fields", async () => {
    const mockResponse = {
      subscriptionId: "sub_456",
      description: "Monitor wallet transactions",
      eventTypes: [
        "wallet.transaction.pending",
        "wallet.transaction.confirmed",
        "wallet.transaction.failed",
      ],
      target: {
        url: "https://example.com/webhook",
        headers: { "X-Custom-Header": "custom-value" },
      },
      isEnabled: false,
      secret: "whsec_another_secret",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T01:00:00Z",
    };

    (mockClient.createWebhookSubscription as any).mockResolvedValue(mockResponse);

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

    const result = await createWebhookSubscription(mockClient, options);

    expect(mockClient.createWebhookSubscription).toHaveBeenCalledWith({
      description: "Monitor wallet transactions",
      eventTypes: [
        "wallet.transaction.pending",
        "wallet.transaction.confirmed",
        "wallet.transaction.failed",
      ],
      target: {
        url: "https://example.com/webhook",
        headers: { "X-Custom-Header": "custom-value" },
      },
      isEnabled: false,
      metadata: { env: "production" },
    });

    expect(result).toEqual({
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
    });
  });

  it("should default isEnabled to true when not provided", async () => {
    const mockResponse = {
      subscriptionId: "sub_789",
      eventTypes: ["wallet.transaction.created"],
      target: { url: "https://example.com/webhook" },
      isEnabled: true,
      secret: "whsec_default_secret",
      createdAt: "2026-04-01T00:00:00Z",
    };

    (mockClient.createWebhookSubscription as any).mockResolvedValue(mockResponse);

    const options: CreateWebhookSubscriptionOptions = {
      eventTypes: ["wallet.transaction.created"],
      targetUrl: "https://example.com/webhook",
    };

    await createWebhookSubscription(mockClient, options);

    expect(mockClient.createWebhookSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        isEnabled: true,
      }),
    );
  });

  it("should handle all seven wallet transaction event types", async () => {
    const allEventTypes: WebhookEventType[] = [
      "wallet.transaction.created",
      "wallet.transaction.broadcast",
      "wallet.transaction.pending",
      "wallet.transaction.replaced",
      "wallet.transaction.confirmed",
      "wallet.transaction.failed",
      "wallet.transaction.signed",
    ];

    const mockResponse = {
      subscriptionId: "sub_all",
      eventTypes: allEventTypes,
      target: { url: "https://example.com/webhook" },
      isEnabled: true,
      secret: "whsec_all_events",
      createdAt: "2026-04-01T00:00:00Z",
    };

    (mockClient.createWebhookSubscription as any).mockResolvedValue(mockResponse);

    const options: CreateWebhookSubscriptionOptions = {
      eventTypes: allEventTypes,
      targetUrl: "https://example.com/webhook",
    };

    const result = await createWebhookSubscription(mockClient, options);

    expect(result.eventTypes).toHaveLength(7);
    expect(result.eventTypes).toEqual(allEventTypes);
  });

  it("should propagate API errors", async () => {
    const mockError = new Error("API request failed");
    (mockClient.createWebhookSubscription as any).mockRejectedValue(mockError);

    const options: CreateWebhookSubscriptionOptions = {
      eventTypes: ["wallet.transaction.confirmed"],
      targetUrl: "https://example.com/webhook",
    };

    await expect(createWebhookSubscription(mockClient, options)).rejects.toThrow(
      "API request failed",
    );
  });

  it("should correctly map targetUrl and targetHeaders to nested target object", async () => {
    const mockResponse = {
      subscriptionId: "sub_mapping",
      eventTypes: ["wallet.transaction.confirmed"],
      target: {
        url: "https://example.com/webhook",
        headers: { Authorization: "Bearer token123" },
      },
      isEnabled: true,
      secret: "whsec_mapping_secret",
      createdAt: "2026-04-01T00:00:00Z",
    };

    (mockClient.createWebhookSubscription as any).mockResolvedValue(mockResponse);

    const options: CreateWebhookSubscriptionOptions = {
      eventTypes: ["wallet.transaction.confirmed"],
      targetUrl: "https://example.com/webhook",
      targetHeaders: { Authorization: "Bearer token123" },
    };

    await createWebhookSubscription(mockClient, options);

    expect(mockClient.createWebhookSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          url: "https://example.com/webhook",
          headers: { Authorization: "Bearer token123" },
        },
      }),
    );
  });
});
