import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCdpFacilitatorClient } from "../../../src/core/facilitator/index.js";
import { CDP_FACILITATOR_URL } from "../../../src/core/facilitator/constants.js";

// Mock @x402/core/server so we can inspect HTTPFacilitatorClient constructor calls
vi.mock("@x402/core/server", () => ({
  HTTPFacilitatorClient: vi.fn().mockImplementation((config) => ({
    _config: config,
    verify: vi.fn(),
    settle: vi.fn(),
    getSupported: vi.fn(),
  })),
}));

// Mock the CDP SDK auth module
vi.mock("@coinbase/cdp-sdk/auth", () => ({
  generateJwt: vi.fn().mockResolvedValue("mock-jwt"),
}));

describe("createCdpFacilitatorClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Provide default env credentials so most tests don't need to supply them
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns an HTTPFacilitatorClient instance", async () => {
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    const client = createCdpFacilitatorClient();
    expect(HTTPFacilitatorClient).toHaveBeenCalledOnce();
    expect(client).toBeDefined();
  });

  it("uses CDP_FACILITATOR_URL by default", async () => {
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    createCdpFacilitatorClient();
    const [config] = (HTTPFacilitatorClient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(config.url).toBe(CDP_FACILITATOR_URL);
  });

  it("passes a createAuthHeaders function to the client", async () => {
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    createCdpFacilitatorClient();
    const [config] = (HTTPFacilitatorClient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(typeof config.createAuthHeaders).toBe("function");
  });

  it("creates auth headers with CDP JWT tokens", async () => {
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
    createCdpFacilitatorClient();
    const [config] = (HTTPFacilitatorClient as ReturnType<typeof vi.fn>).mock.calls[0];

    const headers = await config.createAuthHeaders();
    expect(generateJwt).toHaveBeenCalledTimes(3); // verify, settle, supported
    expect(headers).toHaveProperty("verify");
    expect(headers).toHaveProperty("settle");
    expect(headers).toHaveProperty("supported");
    expect(headers.verify.Authorization).toBe("Bearer mock-jwt");
  });

  it("reads credentials from CDP_API_KEY_* env vars when no args are provided", async () => {
    const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    createCdpFacilitatorClient();
    const [config] = (HTTPFacilitatorClient as ReturnType<typeof vi.fn>).mock.calls[0];
    await config.createAuthHeaders();

    expect(generateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: "env-key-id",
        apiKeySecret: "env-key-secret",
      }),
    );
  });

  it("prefers CDP_SERVER_API_KEY_* env vars over CDP_API_KEY_*", async () => {
    process.env.CDP_SERVER_API_KEY_ID = "server-key-id";
    process.env.CDP_SERVER_API_KEY_SECRET = "server-key-secret";
    const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    createCdpFacilitatorClient();
    const [config] = (HTTPFacilitatorClient as ReturnType<typeof vi.fn>).mock.calls[0];
    await config.createAuthHeaders();

    expect(generateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: "server-key-id",
        apiKeySecret: "server-key-secret",
      }),
    );
  });

  it("uses explicit credentials over env vars", async () => {
    const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    createCdpFacilitatorClient({
      apiKeyId: "explicit-key-id",
      apiKeySecret: "explicit-key-secret",
    });
    const [config] = (HTTPFacilitatorClient as ReturnType<typeof vi.fn>).mock.calls[0];
    await config.createAuthHeaders();

    expect(generateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: "explicit-key-id",
        apiKeySecret: "explicit-key-secret",
      }),
    );
  });

  it("throws when CDP_API_KEY_ID is missing", () => {
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
