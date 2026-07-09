import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CDP_FACILITATOR_URL, createCdpFacilitatorClient } from "./facilitator.js";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { MockHTTPFacilitatorClient, mockGenerateJwt } = vi.hoisted(() => {
  const mockGenerateJwt = vi.fn();
  const MockHTTPFacilitatorClient = vi.fn().mockImplementation(config => ({
    _config: config,
    verify: vi.fn(),
    settle: vi.fn(),
    getSupported: vi.fn(),
  }));

  return { MockHTTPFacilitatorClient, mockGenerateJwt };
});

vi.mock("@x402/core/server", () => ({
  HTTPFacilitatorClient: MockHTTPFacilitatorClient,
}));

vi.mock("../auth/index.js", () => ({
  generateJwt: mockGenerateJwt,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConstructorConfig() {
  expect(MockHTTPFacilitatorClient).toHaveBeenCalledOnce();
  return MockHTTPFacilitatorClient.mock.calls[0][0] as {
    url: string;
    createAuthHeaders: () => Promise<{
      verify: Record<string, string>;
      settle: Record<string, string>;
      supported: Record<string, string>;
    }>;
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("createCdpFacilitatorClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    mockGenerateJwt.mockResolvedValue("mock-jwt");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── Client construction ────────────────────────────────────────────────────

  describe("client construction", () => {
    it("returns an HTTPFacilitatorClient instance", () => {
      const client = createCdpFacilitatorClient();
      expect(MockHTTPFacilitatorClient).toHaveBeenCalledOnce();
      expect(client).toBeDefined();
    });

    it("configures the client with the CDP facilitator URL", () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      expect(config.url).toBe(CDP_FACILITATOR_URL);
      expect(config.url).toBe("https://api.cdp.coinbase.com/platform/v2/x402");
    });

    it("passes a createAuthHeaders function to the client", () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      expect(typeof config.createAuthHeaders).toBe("function");
    });
  });

  // ─── Credential resolution ──────────────────────────────────────────────────

  describe("credential resolution", () => {
    it("reads credentials from CDP_API_KEY_* env vars when no args are provided", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: "env-key-id",
          apiKeySecret: "env-key-secret",
        }),
      );
    });

    it("uses explicit args over env vars", async () => {
      createCdpFacilitatorClient({
        apiKeyId: "explicit-key-id",
        apiKeySecret: "explicit-key-secret",
      });
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: "explicit-key-id",
          apiKeySecret: "explicit-key-secret",
        }),
      );
    });

    it("throws when both CDP_API_KEY_ID and CDP_API_KEY_SECRET are missing", () => {
      delete process.env.CDP_API_KEY_ID;
      delete process.env.CDP_API_KEY_SECRET;

      expect(() => createCdpFacilitatorClient()).toThrow(
        /Missing required CDP credentials:.*CDP_API_KEY_ID.*CDP_API_KEY_SECRET/,
      );
    });

    it("throws when only CDP_API_KEY_ID is missing", () => {
      delete process.env.CDP_API_KEY_ID;

      expect(() => createCdpFacilitatorClient()).toThrow(/CDP_API_KEY_ID/);
      expect(() => createCdpFacilitatorClient()).not.toThrow(/CDP_API_KEY_SECRET/);
    });

    it("throws when only CDP_API_KEY_SECRET is missing", () => {
      delete process.env.CDP_API_KEY_SECRET;

      expect(() => createCdpFacilitatorClient()).toThrow(/CDP_API_KEY_SECRET/);
      expect(() => createCdpFacilitatorClient()).not.toThrow(/CDP_API_KEY_ID/);
    });
  });

  // ─── Auth headers ───────────────────────────────────────────────────────────

  describe("createAuthHeaders", () => {
    it("generates auth headers for verify, settle, and supported endpoints", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      const headers = await config.createAuthHeaders();

      expect(headers).toHaveProperty("verify");
      expect(headers).toHaveProperty("settle");
      expect(headers).toHaveProperty("supported");
    });

    it("calls generateJwt three times (once per endpoint)", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledTimes(3);
    });

    it("sets Authorization header as Bearer JWT for each endpoint", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      const headers = await config.createAuthHeaders();

      expect(headers.verify.Authorization).toBe("Bearer mock-jwt");
      expect(headers.settle.Authorization).toBe("Bearer mock-jwt");
      expect(headers.supported.Authorization).toBe("Bearer mock-jwt");
    });

    it("generates fresh JWTs on every createAuthHeaders call", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();

      await config.createAuthHeaders();
      expect(mockGenerateJwt).toHaveBeenCalledTimes(3);

      await config.createAuthHeaders();
      expect(mockGenerateJwt).toHaveBeenCalledTimes(6);
    });

    it("uses POST method for verify endpoint", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestMethod: "POST",
          requestPath: "/platform/v2/x402/verify",
          requestHost: "api.cdp.coinbase.com",
        }),
      );
    });

    it("uses POST method for settle endpoint", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestMethod: "POST",
          requestPath: "/platform/v2/x402/settle",
          requestHost: "api.cdp.coinbase.com",
        }),
      );
    });

    it("uses GET method for supported endpoint", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestMethod: "GET",
          requestPath: "/platform/v2/x402/supported",
          requestHost: "api.cdp.coinbase.com",
        }),
      );
    });

    it("includes Correlation-Context header with cdp-sdk source", async () => {
      createCdpFacilitatorClient();
      const config = getConstructorConfig();
      const headers = await config.createAuthHeaders();

      for (const endpoint of ["verify", "settle", "supported"] as const) {
        const ctx = headers[endpoint]["Correlation-Context"];
        expect(ctx).toContain("source=cdp-sdk");
        expect(ctx).toContain("sdkLanguage=typescript");
        expect(ctx).toContain("sourceVersion=");
      }
    });
  });

  // ─── Custom baseUrl ─────────────────────────────────────────────────────────

  describe("custom baseUrl", () => {
    const STAGING_URL = "https://mock-staging-facilitator.example.com/platform/v2/x402";

    it("configures the client with the custom base URL", () => {
      createCdpFacilitatorClient({ baseUrl: STAGING_URL });
      const config = getConstructorConfig();
      expect(config.url).toBe(STAGING_URL);
    });

    it("derives the JWT host from the custom base URL", async () => {
      createCdpFacilitatorClient({ baseUrl: STAGING_URL });
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestHost: "mock-staging-facilitator.example.com",
        }),
      );
    });

    it("derives JWT paths from the custom base URL pathname", async () => {
      createCdpFacilitatorClient({ baseUrl: STAGING_URL });
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestPath: "/platform/v2/x402/verify",
          requestHost: "mock-staging-facilitator.example.com",
        }),
      );
      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestPath: "/platform/v2/x402/settle",
          requestHost: "mock-staging-facilitator.example.com",
        }),
      );
      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestPath: "/platform/v2/x402/supported",
          requestHost: "mock-staging-facilitator.example.com",
        }),
      );
    });

    it("handles a base URL with a non-standard pathname", async () => {
      createCdpFacilitatorClient({ baseUrl: "https://localhost:8080/x402" });
      const config = getConstructorConfig();
      expect(config.url).toBe("https://localhost:8080/x402");
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestHost: "localhost:8080",
          requestPath: "/x402/verify",
        }),
      );
    });

    it("strips a trailing slash from the base URL pathname before appending operation suffixes", async () => {
      createCdpFacilitatorClient({
        baseUrl: "https://mock-staging-facilitator.example.com/platform/v2/x402/",
      });
      const config = getConstructorConfig();
      await config.createAuthHeaders();

      expect(mockGenerateJwt).toHaveBeenCalledWith(
        expect.objectContaining({ requestPath: "/platform/v2/x402/verify" }),
      );
    });

    it("throws a clear error when baseUrl is not a valid URL", () => {
      expect(() => createCdpFacilitatorClient({ baseUrl: "not-a-valid-url" })).toThrow(
        /Invalid facilitator baseUrl/,
      );
    });
  });
});
