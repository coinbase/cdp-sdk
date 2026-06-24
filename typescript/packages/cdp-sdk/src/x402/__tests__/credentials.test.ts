import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveCredentials, resolveWalletConfig, parseRpcUrlsFromEnv } from "../credentials.js";
import type { CdpX402ClientConfig } from "../credentials.js";

describe("resolveCredentials", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CDP_API_KEY_ID;
    delete process.env.CDP_API_KEY_SECRET;
    delete process.env.CDP_WALLET_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns credentials from explicit config", () => {
    const config: CdpX402ClientConfig = {
      apiKeyId: "key-id",
      apiKeySecret: "key-secret",
      walletSecret: "wallet-secret",
    };
    const result = resolveCredentials(config);
    expect(result).toEqual({
      apiKeyId: "key-id",
      apiKeySecret: "key-secret",
      walletSecret: "wallet-secret",
    });
  });

  it("falls back to environment variables when config fields are absent", () => {
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";

    const result = resolveCredentials(undefined);
    expect(result).toEqual({
      apiKeyId: "env-key-id",
      apiKeySecret: "env-key-secret",
      walletSecret: "env-wallet-secret",
    });
  });

  it("explicit config takes precedence over environment variables", () => {
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";

    const config: CdpX402ClientConfig = {
      apiKeyId: "config-key-id",
      apiKeySecret: "config-key-secret",
      walletSecret: "config-wallet-secret",
    };
    const result = resolveCredentials(config);
    expect(result.apiKeyId).toBe("config-key-id");
    expect(result.apiKeySecret).toBe("config-key-secret");
    expect(result.walletSecret).toBe("config-wallet-secret");
  });

  it("throws when CDP_API_KEY_ID is missing", () => {
    process.env.CDP_API_KEY_SECRET = "secret";
    process.env.CDP_WALLET_SECRET = "wallet";
    expect(() => resolveCredentials(undefined)).toThrow("CDP_API_KEY_ID");
  });

  it("throws when CDP_API_KEY_SECRET is missing", () => {
    process.env.CDP_API_KEY_ID = "id";
    process.env.CDP_WALLET_SECRET = "wallet";
    expect(() => resolveCredentials(undefined)).toThrow("CDP_API_KEY_SECRET");
  });

  it("throws when CDP_WALLET_SECRET is missing", () => {
    process.env.CDP_API_KEY_ID = "id";
    process.env.CDP_API_KEY_SECRET = "secret";
    expect(() => resolveCredentials(undefined)).toThrow("CDP_WALLET_SECRET");
  });

  it("lists all missing credentials in the error message", () => {
    expect(() => resolveCredentials(undefined)).toThrow(
      /CDP_API_KEY_ID.*CDP_API_KEY_SECRET.*CDP_WALLET_SECRET/,
    );
  });
});

describe("resolveWalletConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CDP_WALLET_TYPE;
    delete process.env.CDP_ACCOUNT_NAME;
    delete process.env.CDP_OWNER_ACCOUNT_NAME;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to eoa type with default account name", () => {
    const result = resolveWalletConfig(undefined);
    expect(result.type).toBe("eoa");
    expect(result.accountName).toBe("x402-client-wallet-1");
    expect(result.ownerAccountName).toBeUndefined();
  });

  it("uses CDP_ACCOUNT_NAME env var when accountName is absent", () => {
    process.env.CDP_ACCOUNT_NAME = "my-account";
    const result = resolveWalletConfig(undefined);
    expect(result.accountName).toBe("my-account");
  });

  it("resolves eoa config", () => {
    const result = resolveWalletConfig({ type: "eoa", accountName: "payer" });
    expect(result).toEqual({ type: "eoa", accountName: "payer", ownerAccountName: undefined });
  });

  it("resolves smart config with explicit ownerAccountName", () => {
    const result = resolveWalletConfig({
      type: "smart",
      accountName: "my-scw",
      ownerAccountName: "my-owner",
    });
    expect(result).toEqual({ type: "smart", accountName: "my-scw", ownerAccountName: "my-owner" });
  });

  it("resolves smart config with ownerAccountName from env", () => {
    process.env.CDP_OWNER_ACCOUNT_NAME = "env-owner";
    const result = resolveWalletConfig({ type: "smart", ownerAccountName: "env-owner" });
    expect(result.ownerAccountName).toBe("env-owner");
  });

  it("throws for smart type without ownerAccountName", () => {
    expect(() =>
      resolveWalletConfig({ type: "smart", ownerAccountName: undefined as unknown as string }),
    ).toThrow("ownerAccountName");
  });

  it("reads wallet type from CDP_WALLET_TYPE env var", () => {
    process.env.CDP_WALLET_TYPE = "eoa";
    const result = resolveWalletConfig(undefined);
    expect(result.type).toBe("eoa");
  });

  it("throws for unsupported wallet type", () => {
    process.env.CDP_WALLET_TYPE = "invalid-type";
    expect(() => resolveWalletConfig(undefined)).toThrow('Unsupported wallet type "invalid-type"');
  });
});

describe("parseRpcUrlsFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CDP_X402_RPC_URLS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns undefined when CDP_X402_RPC_URLS is not set", () => {
    expect(parseRpcUrlsFromEnv()).toBeUndefined();
  });

  it("parses valid JSON object", () => {
    process.env.CDP_X402_RPC_URLS = JSON.stringify({
      "eip155:8453": "https://mainnet.base.org",
    });
    const result = parseRpcUrlsFromEnv();
    expect(result).toEqual({ "eip155:8453": { rpcUrl: "https://mainnet.base.org" } });
  });

  it("parses multiple networks", () => {
    process.env.CDP_X402_RPC_URLS = JSON.stringify({
      "eip155:8453": "https://base.rpc",
      "eip155:84532": "https://sepolia.rpc",
    });
    const result = parseRpcUrlsFromEnv();
    expect(result).toEqual({
      "eip155:8453": { rpcUrl: "https://base.rpc" },
      "eip155:84532": { rpcUrl: "https://sepolia.rpc" },
    });
  });

  it("throws for invalid JSON", () => {
    process.env.CDP_X402_RPC_URLS = "not-json";
    expect(() => parseRpcUrlsFromEnv()).toThrow("CDP_X402_RPC_URLS must be valid JSON");
  });

  it("throws for JSON array", () => {
    process.env.CDP_X402_RPC_URLS = "[]";
    expect(() => parseRpcUrlsFromEnv()).toThrow("CDP_X402_RPC_URLS must be a JSON object");
  });

  it("throws when a value is not a string URL", () => {
    process.env.CDP_X402_RPC_URLS = JSON.stringify({ "eip155:8453": 42 });
    expect(() => parseRpcUrlsFromEnv()).toThrow('value for "eip155:8453" must be a string URL');
  });
});
