import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCdpAuthHeaders } from "../../../src/core/facilitator/index.js";
import type { ResolvedCdpCredentials } from "../../../src/core/index.js";

// Mock the CDP SDK auth module
vi.mock("@coinbase/cdp-sdk/auth", () => ({
  generateJwt: vi.fn().mockImplementation(async (args) => {
    // Return a deterministic mock JWT based on the path
    return `mock-jwt-for-${args.requestPath}`;
  }),
}));

describe("auth", () => {
  const mockCredentials: ResolvedCdpCredentials = {
    apiKeyId: "test-key-id",
    apiKeySecret: "test-key-secret",
    walletSecret: "test-wallet-secret",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCdpAuthHeaders", () => {
    it("returns a function", () => {
      const fn = createCdpAuthHeaders(mockCredentials);
      expect(typeof fn).toBe("function");
    });

    it("generates auth headers for all facilitator endpoints", async () => {
      const getHeaders = createCdpAuthHeaders(mockCredentials);
      const headers = await getHeaders();

      expect(headers).toHaveProperty("verify");
      expect(headers).toHaveProperty("settle");
      expect(headers).toHaveProperty("supported");
    });

    it("generates Bearer token for verify endpoint", async () => {
      const getHeaders = createCdpAuthHeaders(mockCredentials);
      const headers = await getHeaders();

      expect(headers.verify.Authorization).toBe("Bearer mock-jwt-for-/platform/v2/x402/verify");
    });

    it("generates Bearer token for settle endpoint", async () => {
      const getHeaders = createCdpAuthHeaders(mockCredentials);
      const headers = await getHeaders();

      expect(headers.settle.Authorization).toBe("Bearer mock-jwt-for-/platform/v2/x402/settle");
    });

    it("generates Bearer token for supported endpoint", async () => {
      const getHeaders = createCdpAuthHeaders(mockCredentials);
      const headers = await getHeaders();

      expect(headers.supported.Authorization).toBe(
        "Bearer mock-jwt-for-/platform/v2/x402/supported",
      );
    });

    it("includes Correlation-Context header with SDK metadata", async () => {
      const getHeaders = createCdpAuthHeaders(mockCredentials);
      const headers = await getHeaders();

      for (const endpoint of ["verify", "settle", "supported"] as const) {
        const ctx = headers[endpoint]["Correlation-Context"];
        expect(ctx).toContain("source=cdp-x402");
        expect(ctx).toContain("sourceVersion=0.0.1");
      }
    });

    it("generates fresh JWTs on each call", async () => {
      const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
      const getHeaders = createCdpAuthHeaders(mockCredentials);

      await getHeaders();
      expect(generateJwt).toHaveBeenCalledTimes(3); // verify, settle, supported

      await getHeaders();
      expect(generateJwt).toHaveBeenCalledTimes(6); // 3 more
    });

    it("passes correct parameters to generateJwt", async () => {
      const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
      const getHeaders = createCdpAuthHeaders(mockCredentials);

      await getHeaders();

      expect(generateJwt).toHaveBeenCalledWith({
        apiKeyId: "test-key-id",
        apiKeySecret: "test-key-secret",
        requestMethod: "POST",
        requestHost: "api.cdp.coinbase.com",
        requestPath: "/platform/v2/x402/verify",
      });

      expect(generateJwt).toHaveBeenCalledWith({
        apiKeyId: "test-key-id",
        apiKeySecret: "test-key-secret",
        requestMethod: "POST",
        requestHost: "api.cdp.coinbase.com",
        requestPath: "/platform/v2/x402/settle",
      });

      expect(generateJwt).toHaveBeenCalledWith({
        apiKeyId: "test-key-id",
        apiKeySecret: "test-key-secret",
        requestMethod: "GET",
        requestHost: "api.cdp.coinbase.com",
        requestPath: "/platform/v2/x402/supported",
      });
    });
  });
});
