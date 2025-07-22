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

  it("should require wallet auth for DELETE requests on accounts", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      requestMethod: "DELETE",
      requestPath: "/accounts/123",
      walletSecret: "test-wallet-secret",
    });

    expect(generateWalletJwt).toHaveBeenCalled();
    expect(headers["X-Wallet-Auth"]).toBe(mockWalletAuthToken);
  });

  it("should not require wallet auth for GET requests", async () => {
    const headers = await getAuthHeaders({
      ...defaultOptions,
      walletSecret: "test-wallet-secret",
    });

    expect(generateWalletJwt).not.toHaveBeenCalled();
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
  });
});
