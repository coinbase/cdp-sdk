import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWebSocketAuthHeaders } from "./ws.js";
import { generateJwt } from "./jwt.js";
import { version } from "../../version.js";

// Mock the imported modules
vi.mock("./jwt");

describe("WebSocket utils", () => {
  const mockJWT = "mock.websocket.jwt.token";

  const defaultOptions = {
    apiKeyId: "test-key-id",
    apiKeySecret: "test-key-secret",
  };

  beforeEach(() => {
    vi.mocked(generateJwt).mockResolvedValue(mockJWT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should generate WebSocket auth headers", async () => {
    const headers = await getWebSocketAuthHeaders(defaultOptions);

    expect(generateJwt).toHaveBeenCalledWith({
      apiKeyId: defaultOptions.apiKeyId,
      apiKeySecret: defaultOptions.apiKeySecret,
      requestMethod: null,
      requestHost: null,
      requestPath: null,
      expiresIn: undefined,
      audience: undefined,
    });

    expect(headers["Authorization"]).toBe(`Bearer ${mockJWT}`);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Wallet-Auth"]).toBeUndefined();
  });

  it("should respect custom expiration time", async () => {
    const customExpiration = 300;
    const headers = await getWebSocketAuthHeaders({
      ...defaultOptions,
      expiresIn: customExpiration,
    });

    expect(generateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresIn: customExpiration,
      }),
    );
  });

  it("should include default correlation context", async () => {
    const headers = await getWebSocketAuthHeaders(defaultOptions);

    expect(headers["Correlation-Context"]).toBe(
      `sdk_version=${version},sdk_language=typescript,source=sdk-auth`,
    );
  });

  it("should include custom correlation context", async () => {
    const headers = await getWebSocketAuthHeaders({
      ...defaultOptions,
      source: "custom-source",
      sourceVersion: "1.0.0",
    });

    expect(headers["Correlation-Context"]).toBe(
      `sdk_version=${version},sdk_language=typescript,source=custom-source,source_version=1.0.0`,
    );
  });
});
