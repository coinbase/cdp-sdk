import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { InvalidWalletSecretFormatError, UndefinedWalletSecretError } from "../errors.js";
import { generateJwt, JwtOptions, WalletJwtOptions, generateWalletJwt } from "./jwt.js";
import { hash } from "../../utils/hash.js";

describe("JWT Authentication", () => {
  // Generate EC256 key pair for testing
  const testECPrivateKey = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256", // secp256k1 for ES256
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "sec1", format: "pem" },
  }).privateKey;

  // Generate Ed25519 key pair for testing
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const testEd25519Key = Buffer.concat([
    privateKey.export({ type: "pkcs8", format: "der" }).subarray(-32), // Extract the 32-byte private key
    publicKey.export({ type: "spki", format: "der" }).subarray(-32), // Extract the 32-byte public key
  ]).toString("base64");

  // Generate a valid Wallet Secret in proper PKCS8 DER format
  const testWalletSecret = crypto
    .generateKeyPairSync("ec", {
      namedCurve: "P-256",
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "der" },
    })
    .privateKey.toString("base64");

  const defaultECOptions: JwtOptions = {
    apiKeyId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    apiKeySecret: testECPrivateKey,
    requestMethod: "GET",
    requestHost: "api.cdp.coinbase.com",
    requestPath: "/platform/v1/wallets",
  };

  const defaultEd25519Options: JwtOptions = {
    ...defaultECOptions,
    apiKeySecret: testEd25519Key,
  };

  const defaultWalletJwtOptions: WalletJwtOptions = {
    walletSecret: testWalletSecret,
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
    const token = await generateJwt(defaultECOptions);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("should generate a valid JWT token with Ed25519 key", async () => {
    const token = await generateJwt(defaultEd25519Options);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("should include correct claims in the JWT payload for EC key", async () => {
    const token = await generateJwt(defaultECOptions);
    const payload = decodeJwt(token);

    expect(payload.iss).toBe("cdp");
    expect(payload.sub).toBe(defaultECOptions.apiKeyId);
    expect(payload.aud).toEqual(["cdp_service"]);
    expect(payload.uris).toEqual([
      `${defaultECOptions.requestMethod} ${defaultECOptions.requestHost}${defaultECOptions.requestPath}`,
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
    const token = await generateJwt({
      ...defaultECOptions,
      expiresIn: customExpiration,
    });
    const payload = decodeJwt(token);

    expect(payload.exp - payload.nbf).toBe(customExpiration);
  });

  it("should throw error when required parameters are missing", async () => {
    const invalidOptions = { ...defaultECOptions };
    delete (invalidOptions as Partial<JwtOptions>).apiKeyId;

    await expect(generateJwt(invalidOptions as JwtOptions)).rejects.toThrow("Key name is required");
  });

  it("should include nonce in header for EC key", async () => {
    const token = await generateJwt(defaultECOptions);
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString());

    expect(header.nonce).toBeTruthy();
    expect(typeof header.nonce).toBe("string");
    expect(header.nonce.length).toBe(32); // 16 bytes in hex = 32 characters
  });

  it("should use ES256 algorithm for EC key", async () => {
    const token = await generateJwt(defaultECOptions);
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString());

    expect(header.alg).toBe("ES256");
  });

  it("should use EdDSA algorithm for Ed25519 key", async () => {
    const token = await generateJwt(defaultEd25519Options);
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
      ...defaultEd25519Options,
      apiKeySecret: Buffer.from("too-short").toString("base64"),
    };

    await expect(generateJwt(invalidOptions)).rejects.toThrow(
      "Invalid key format - must be either PEM EC key or base64 Ed25519 key",
    );
  });

  it("should generate a valid Wallet Auth JWT token", async () => {
    const token = await generateWalletJwt(defaultWalletJwtOptions);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("should include correct claims in Wallet Auth JWT payload", async () => {
    const token = await generateWalletJwt(defaultWalletJwtOptions);
    const payload = decodeJwt(token);

    expect(payload.uris).toEqual([
      `${defaultWalletJwtOptions.requestMethod} ${defaultWalletJwtOptions.requestHost}${defaultWalletJwtOptions.requestPath}`,
    ]);
    expect(payload.reqHash).toEqual(
      hash(Buffer.from(JSON.stringify(defaultWalletJwtOptions.requestData))),
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
      requestData: {},
    };

    const token = await generateWalletJwt(options);
    const payload = decodeJwt(token);

    expect(payload.req).toBeUndefined();
  });

  it("should use ES256 algorithm for Wallet Auth JWT", async () => {
    const token = await generateWalletJwt(defaultWalletJwtOptions);
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString());

    expect(header.alg).toBe("ES256");
    expect(header.typ).toBe("JWT");
  });
});
