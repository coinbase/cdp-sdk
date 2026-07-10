import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAuthHeaders } from "./http.js";
import { generateWalletJwt, generateJwt } from "./jwt.js";
import { version } from "../../version.js";

// Mock the imported modules
vi.mock("./jwt");

describe("http utils", () => {
  const mockJWT = "mock.jwt.token";
  const mockWalletAuthToken = "mock.wallet.auth.token";

  const defaultOptions = {
    apiKeyId: "test-key-id",
    apiKeySecret: "test-key-secret",
    requestMethod: "GET",
    requestHost: "api.example.com",
    requestPath: "/test/path",
    requestBody: undefined,
  };

  beforeEach(() => {
    vi.mocked(generateJwt).mockResolvedValue(mockJWT);
    vi.mocked(generateWalletJwt).mockResolvedValue(mockWalletAuthToken);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should generate basic auth headers", async () => {
    const headers = await getAuthHeaders(defaultOptions);

    expect(generateJwt).toHaveBeenCalledWith({
      apiKeyId: defaultOptions.apiKeyId,
      apiKeySecret: defaultOptions.apiKeySecret,
      requestMethod: defaultOptions.requestMethod,
      requestHost: defaultOptions.requestHost,
      requestPath: defaultOptions.requestPath,
    });

    expect(headers["Authorization"]).toBe(`Bearer ${mockJWT}`);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
  });

  it("should add wallet auth for POST requests when path has /accounts", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      requestMethod: "POST",
      walletSecret: "test-wallet-secret",
      requestBody: { test: "data" },
      requestPath: "/v2/evm/accounts",
    });

    expect(generateWalletJwt).toHaveBeenCalledWith({
      walletSecret: "test-wallet-secret",
      requestMethod: "POST",
      requestHost: defaultOptions.requestHost,
      requestPath: "/v2/evm/accounts",
      requestData: { test: "data" },
    });

    expect(headers["X-Wallet-Auth"]).toBe(mockWalletAuthToken);
  });

  it("should throw error if wallet auth is required but secret is missing", async () => {
    await expect(
      getAuthHeaders({
        ...defaultOptions,
        requestMethod: "POST",
        requestPath: "/v2/solana/accounts",
      }),
    ).rejects.toThrow("Wallet Secret not configured");
  });

  it("should include default correlation context", async () => {
    const headers = await getAuthHeaders(defaultOptions);

    expect(headers["Correlation-Context"]).toBe(
      `sdk_version=${version},sdk_language=typescript,source=sdk-auth`,
    );
  });

  it("should include custom correlation context", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      source: "custom-source",
      sourceVersion: "1.0.0",
    });

    expect(headers["Correlation-Context"]).toBe(
      `sdk_version=${version},sdk_language=typescript,source=custom-source,source_version=1.0.0`,
    );
  });

  it("should require wallet auth for PUT requests", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      requestMethod: "PUT",
      walletSecret: "test-wallet-secret",
    });

    expect(generateWalletJwt).not.toHaveBeenCalled();
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
  });

  it("should require wallet auth for DELETE requests on wallet accounts", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      requestMethod: "DELETE",
      requestPath: "/v2/evm/accounts/0x1234567890123456789012345678901234567890",
      walletSecret: "test-wallet-secret",
    });

    expect(generateWalletJwt).toHaveBeenCalled();
    expect(headers["X-Wallet-Auth"]).toBe(mockWalletAuthToken);
  });

  it("should not require wallet auth for custodial /v2/accounts writes", async () => {
    // The custodial account endpoint (POST /v2/accounts) authenticates with the
    // API key alone — the spec declares apiKeyAuth and no X-Wallet-Auth param.
    // A bare includes("/accounts") used to over-match it and force wallet auth.
    const headers = await getAuthHeaders({
      ...defaultOptions,
      requestMethod: "POST",
      requestPath: "/v2/accounts",
      walletSecret: "test-wallet-secret",
    });

    expect(generateWalletJwt).not.toHaveBeenCalled();
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
  });

  it("should not require wallet auth (or a secret) for custodial account creation without a wallet secret", async () => {
    // Regression for the reported error: creating a custodial account without
    // CDP_WALLET_SECRET set must NOT throw "Wallet Secret not configured".
    const headers = await getAuthHeaders({
      ...defaultOptions,
      requestMethod: "POST",
      requestPath: "/v2/accounts",
    });

    expect(headers["Authorization"]).toBeDefined();
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
  });

  it("should not require wallet auth for GET requests", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      walletSecret: "test-wallet-secret",
    });

    expect(generateWalletJwt).not.toHaveBeenCalled();
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
  });

  it("should throw a clear error when credentials are missing for a non-public operation", async () => {
    await expect(
      getAuthHeaders({
        ...defaultOptions,
        apiKeyId: undefined,
        apiKeySecret: undefined,
      }),
    ).rejects.toThrow("Missing required CDP API Key configuration");

    expect(generateJwt).not.toHaveBeenCalled();
  });

  it("should skip JWT and wallet auth headers for a public operation when credentials are missing", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      apiKeyId: undefined,
      apiKeySecret: undefined,
      requestMethod: "POST",
      requestPath: "/v2/x402/discovery/mcp",
    });

    expect(generateJwt).not.toHaveBeenCalled();
    expect(generateWalletJwt).not.toHaveBeenCalled();
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
    expect(headers["Correlation-Context"]).toBe(
      `sdk_version=${version},sdk_language=typescript,source=sdk-auth`,
    );
  });

  it("should still send a bearer token for a public operation when credentials are present", async () => {
    // Sending the token even when it's not required lets the server distinguish an
    // authenticated caller from an anonymous one.
    const headers = await getAuthHeaders({
      ...defaultOptions,
      requestMethod: "POST",
      requestPath: "/v2/x402/discovery/mcp",
    });

    expect(generateJwt).toHaveBeenCalled();
    expect(headers["Authorization"]).toBe(`Bearer ${mockJWT}`);
  });
});
