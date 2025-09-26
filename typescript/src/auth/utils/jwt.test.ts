import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
import { InvalidWalletSecretFormatError, UndefinedWalletSecretError } from "../errors.js";
import { generateJwt, JwtOptions, WalletJwtOptions, generateWalletJwt } from "./jwt.js";
import { authHash } from "./hash.js";
import { sortKeys } from "../../utils/sortKeys.js";

describe("JWT Authentication", () => {
  let testECPrivateKey: string;
  let testEd25519Key: string;
  let testWalletSecret: string;

  beforeAll(async () => {
    // Generate valid EC key pair for testing (extractable so we can export)
    const ecKeyPair = await generateKeyPair("ES256", { extractable: true });
    testECPrivateKey = await exportPKCS8(ecKeyPair.privateKey);

    // Generate valid Ed25519 key pair for testing (extractable so we can export)
    const ed25519KeyPair = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
    const privateKeyJwk = await exportJWK(ed25519KeyPair.privateKey);

    // Create 64-byte key (32-byte seed + 32-byte public key) for Ed25519
    const seed = Buffer.from(privateKeyJwk.d!, "base64url");
    const publicKeyJwk = await exportJWK(ed25519KeyPair.publicKey);
    const publicKey = Buffer.from(publicKeyJwk.x!, "base64url");
    testEd25519Key = Buffer.concat([seed, publicKey]).toString("base64");

    // Use same EC key for wallet secret (convert PEM to DER and base64 encode)
    const walletKeyPair = await generateKeyPair("ES256", { extractable: true });
    const walletPrivateKeyPem = await exportPKCS8(walletKeyPair.privateKey);
    // Convert PEM to DER for wallet secret
    const pemBody = walletPrivateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");
    testWalletSecret = pemBody;
  });

  const defaultECOptions: JwtOptions = {
    apiKeyId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    apiKeySecret: "", // Will be set in beforeAll
    requestMethod: "GET",
    requestHost: "api.cdp.coinbase.com",
    requestPath: "/platform/v1/wallets",
  };

  const defaultWalletJwtOptions: WalletJwtOptions = {
    walletSecret: "", // Will be set in beforeAll
    requestMethod: "GET",
    requestHost: "api.coinbase.com",
    requestPath: "/api/v3/brokerage/accounts",
    requestData: {
      wallet_id: "1234567890",
    },
  };

  /**
   * Helper function to decode JWT without verification
   *
   * @param token - JWT token to decode
   * @returns Decoded JWT payload
   */
  const decodeJwt = (token: string) => {
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return payload;
  };

  it("should generate a valid JWT token with EC key", async () => {
    const options = { ...defaultECOptions, apiKeySecret: testECPrivateKey };
    const token = await generateJwt(options);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("should generate a valid JWT token with Ed25519 key", async () => {
    const options = { ...defaultECOptions, apiKeySecret: testEd25519Key };
    const token = await generateJwt(options);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("should include correct claims in the JWT payload for EC key", async () => {
    const options = { ...defaultECOptions, apiKeySecret: testECPrivateKey };
    const token = await generateJwt(options);
    const payload = decodeJwt(token);

    expect(payload.iss).toBe("cdp");
    expect(payload.sub).toBe(options.apiKeyId);
    expect(payload.aud).toEqual(["cdp_service"]);
    expect(payload.uris).toEqual([
      `${options.requestMethod} ${options.requestHost}${options.requestPath}`,
    ]);
    expect(typeof payload.nbf).toBe("number");
    expect(typeof payload.exp).toBe("number");
    expect(payload.exp - payload.nbf).toBe(120); // Default expiration
  });

  it("should generate a valid JWT token for WebSocket with null request parameters", async () => {
    const webSocketOptions: JwtOptions = {
      apiKeyId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      apiKeySecret: testECPrivateKey,
      // All request parameters are null for WebSocket
      requestMethod: null,
      requestHost: null,
      requestPath: null,
    };

    const token = await generateJwt(webSocketOptions);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    // Check payload doesn't have uris claim
    const payload = decodeJwt(token);
    expect(payload.iss).toBe("cdp");
    expect(payload.sub).toBe(webSocketOptions.apiKeyId);
    expect(payload.aud).toEqual(["cdp_service"]);
    expect(payload.uris).toBeUndefined(); // uris claim should not be present
    expect(typeof payload.nbf).toBe("number");
    expect(typeof payload.exp).toBe("number");
  });

  it("should generate a valid JWT token for WebSocket with undefined request parameters", async () => {
    const webSocketOptions: JwtOptions = {
      apiKeyId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      apiKeySecret: testECPrivateKey,
      // All request parameters are undefined for WebSocket
    };

    const token = await generateJwt(webSocketOptions);
    expect(token).toBeTruthy();
    const payload = decodeJwt(token);
    expect(payload.uris).toBeUndefined(); // uris claim should not be present
  });

  it("should reject mixed null and non-null request parameters", async () => {
    const invalidOptions: JwtOptions = {
      apiKeyId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      apiKeySecret: testECPrivateKey,
      requestMethod: "GET",
      requestHost: null, // Mixed: method is set but host is null
      requestPath: "/platform/v1/wallets",
    };

    await expect(generateJwt(invalidOptions)).rejects.toThrow(
      "Either all request details (method, host, path) must be provided, or all must be null",
    );
  });

  it("should respect custom expiration time", async () => {
    const customExpiration = 300;
    const options = { ...defaultECOptions, apiKeySecret: testECPrivateKey };
    const token = await generateJwt({
      ...options,
      expiresIn: customExpiration,
    });
    const payload = decodeJwt(token);

    expect(payload.exp - payload.nbf).toBe(customExpiration);
  });

  it("should throw error when required parameters are missing", async () => {
    const invalidOptions = { ...defaultECOptions, apiKeySecret: testECPrivateKey };
    delete (invalidOptions as Partial<JwtOptions>).apiKeyId;

    await expect(generateJwt(invalidOptions as JwtOptions)).rejects.toThrow("Key name is required");
  });

  it("should include nonce in header for EC key", async () => {
    const options = { ...defaultECOptions, apiKeySecret: testECPrivateKey };
    const token = await generateJwt(options);
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString());

    expect(header.nonce).toBeTruthy();
    expect(typeof header.nonce).toBe("string");
    expect(header.nonce.length).toBe(32); // 16 bytes in hex = 32 characters
  });

  it("should use ES256 algorithm for EC key", async () => {
    const options = { ...defaultECOptions, apiKeySecret: testECPrivateKey };
    const token = await generateJwt(options);
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString());

    expect(header.alg).toBe("ES256");
  });

  it("should use EdDSA algorithm for Ed25519 key", async () => {
    const options = { ...defaultECOptions, apiKeySecret: testEd25519Key };
    const token = await generateJwt(options);
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString());

    expect(header.alg).toBe("EdDSA");
  });

  it("should throw error for invalid EC key format", async () => {
    const invalidOptions = {
      ...defaultECOptions,
      apiKeySecret: "invalid-key-format",
    };

    await expect(generateJwt(invalidOptions)).rejects.toThrow(
      "Invalid key format - must be either PEM EC key or base64 Ed25519 key",
    );
  });

  it("should throw error for invalid Ed25519 key length", async () => {
    const invalidOptions = {
      ...defaultECOptions,
      apiKeySecret: Buffer.from("too-short").toString("base64"),
    };

    await expect(generateJwt(invalidOptions)).rejects.toThrow(
      "Invalid key format - must be either PEM EC key or base64 Ed25519 key",
    );
  });

  it("should generate a valid Wallet Auth JWT token", async () => {
    const options = { ...defaultWalletJwtOptions, walletSecret: testWalletSecret };
    const token = await generateWalletJwt(options);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("should include correct claims in Wallet Auth JWT payload", async () => {
    const options = { ...defaultWalletJwtOptions, walletSecret: testWalletSecret };
    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    expect(payload.uris).toEqual([
      `${options.requestMethod} ${options.requestHost}${options.requestPath}`,
    ]);
    expect(payload.reqHash).toEqual(
      await authHash(Buffer.from(JSON.stringify(sortKeys(options.requestData)))),
    );
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.nbf).toBe("number");
    expect(typeof payload.jti).toBe("string");
  });

  it("should throw UndefinedWalletSecretError when Wallet Secret is missing", async () => {
    const invalidOptions = { ...defaultWalletJwtOptions };
    delete (invalidOptions as Partial<WalletJwtOptions>).walletSecret;

    await expect(generateWalletJwt(invalidOptions as WalletJwtOptions)).rejects.toThrow(
      UndefinedWalletSecretError,
    );
  });

  it("should throw InvalidWalletSecretFormatError for invalid Wallet Secret format", async () => {
    const invalidOptions = {
      ...defaultWalletJwtOptions,
      walletSecret: "invalid-wallet-secret",
    };

    await expect(generateWalletJwt(invalidOptions)).rejects.toThrow(InvalidWalletSecretFormatError);
  });

  it("should support empty request data in Wallet Auth JWT", async () => {
    const options = {
      ...defaultWalletJwtOptions,
      walletSecret: testWalletSecret,
      requestData: {},
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    expect(payload.reqHash).toBeUndefined();
  });

  it("should not include reqHash when request data contains only undefined values", async () => {
    const options = {
      ...defaultWalletJwtOptions,
      walletSecret: testWalletSecret,
      requestData: {
        name: undefined,
        accountPolicy: undefined,
      },
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    expect(payload.reqHash).toBeUndefined();
  });

  it("should include reqHash when request data contains null values", async () => {
    const options = {
      ...defaultWalletJwtOptions,
      walletSecret: testWalletSecret,
      requestData: {
        name: null,
        accountPolicy: null,
      },
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    // null values are preserved in JSON.stringify
    expect(payload.reqHash).toBeDefined();
    expect(payload.reqHash).toEqual(
      await authHash(Buffer.from(JSON.stringify(sortKeys(options.requestData)))),
    );
  });

  it("should include reqHash when request data contains empty string values", async () => {
    const options = {
      ...defaultWalletJwtOptions,
      walletSecret: testWalletSecret,
      requestData: {
        name: undefined,
        accountPolicy: "",
      },
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    // empty string values are preserved in JSON.stringify
    expect(payload.reqHash).toBeDefined();
    expect(payload.reqHash).toEqual(
      await authHash(Buffer.from(JSON.stringify(sortKeys(options.requestData)))),
    );
  });

  it("should include reqHash when request data has at least one meaningful value", async () => {
    const options = {
      ...defaultWalletJwtOptions,
      walletSecret: testWalletSecret,
      requestData: {
        name: "valid-name",
        accountPolicy: undefined,
      },
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    expect(payload.reqHash).toBeDefined();
    expect(payload.reqHash).toEqual(
      await authHash(Buffer.from(JSON.stringify(sortKeys(options.requestData)))),
    );
  });

  it("should include reqHash when request data contains falsy but meaningful values", async () => {
    const options = {
      ...defaultWalletJwtOptions,
      walletSecret: testWalletSecret,
      requestData: {
        count: 0, // meaningful: 0 is preserved
        isValid: false, // meaningful: false is preserved
        description: null, // meaningful: null is preserved
      },
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    expect(payload.reqHash).toBeDefined();
    expect(payload.reqHash).toEqual(
      await authHash(Buffer.from(JSON.stringify(sortKeys(options.requestData)))),
    );
  });

  it("should handle mixed meaningful and meaningless values correctly", async () => {
    const options = {
      ...defaultWalletJwtOptions,
      walletSecret: testWalletSecret,
      requestData: {
        name: undefined, // meaningless
        accountPolicy: null, // meaningful
        description: "", // meaningful
        walletId: "test-wallet", // meaningful
        amount: 100, // meaningful
      },
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    expect(payload.reqHash).toBeDefined();
    expect(payload.reqHash).toEqual(
      await authHash(Buffer.from(JSON.stringify(sortKeys(options.requestData)))),
    );
  });

  it("should use ES256 algorithm for Wallet Auth JWT", async () => {
    const options = { ...defaultWalletJwtOptions, walletSecret: testWalletSecret };
    const token = await generateWalletJwt(options);
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString());

    expect(header.alg).toBe("ES256");
    expect(header.typ).toBe("JWT");
  });
});
