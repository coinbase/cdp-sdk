import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockHttpFacilitatorClient, mockGenerateJwt } = vi.hoisted(() => ({
  mockHttpFacilitatorClient: vi.fn().mockImplementation(() => ({ mockClient: true })),
  mockGenerateJwt: vi.fn().mockResolvedValue("mock-jwt"),
}));

vi.mock("@x402/core/server", () => ({
  HTTPFacilitatorClient: mockHttpFacilitatorClient,
}));

vi.mock("../../auth/index.js", () => ({
  generateJwt: mockGenerateJwt,
}));

import { createCdpFacilitatorClient, CDP_FACILITATOR_URL } from "./index.js";

describe("createCdpFacilitatorClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses mainnet facilitator URL and auth paths by default", async () => {
    createCdpFacilitatorClient({
      apiKeyId: "key-id",
      apiKeySecret: "key-secret",
    });

    expect(mockHttpFacilitatorClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: CDP_FACILITATOR_URL,
      }),
    );

    const config = mockHttpFacilitatorClient.mock.calls[0]?.[0] as {
      createAuthHeaders: () => Promise<Record<string, unknown>>;
    };
    await config.createAuthHeaders();

    expect(mockGenerateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "POST",
        requestPath: "/platform/v2/x402/verify",
      }),
    );
    expect(mockGenerateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "POST",
        requestPath: "/platform/v2/x402/settle",
      }),
    );
    expect(mockGenerateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "GET",
        requestPath: "/platform/v2/x402/supported",
      }),
    );
  });

  it("uses devnet URL and signs devnet endpoint paths", async () => {
    createCdpFacilitatorClient({
      apiKeyId: "key-id",
      apiKeySecret: "key-secret",
      network: "devnet",
    });

    expect(mockHttpFacilitatorClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.cdp.coinbase.com/platform/v2/x402/devnet",
      }),
    );

    const config = mockHttpFacilitatorClient.mock.calls[0]?.[0] as {
      createAuthHeaders: () => Promise<Record<string, unknown>>;
    };
    await config.createAuthHeaders();

    expect(mockGenerateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "POST",
        requestPath: "/platform/v2/x402/devnet/verify",
      }),
    );
    expect(mockGenerateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "POST",
        requestPath: "/platform/v2/x402/devnet/settle",
      }),
    );
    expect(mockGenerateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "GET",
        requestPath: "/platform/v2/x402/devnet/supported",
      }),
    );
  });
});
