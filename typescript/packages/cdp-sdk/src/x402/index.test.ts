import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolveCredentials,
  resolveWalletConfig,
  CDP_FACILITATOR_URL,
  FACILITATOR_PATHS,
} from "./index.js";

describe("core config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("resolveCredentials", () => {
    it("resolves credentials from explicit config", () => {
      const result = resolveCredentials({
        apiKeyId: "test-key-id",
        apiKeySecret: "test-key-secret",
        walletSecret: "test-wallet-secret",
      });

      expect(result).toEqual({
        apiKeyId: "test-key-id",
        apiKeySecret: "test-key-secret",
        walletSecret: "test-wallet-secret",
      });
    });

    it("resolves credentials from environment variables", () => {
      process.env.CDP_API_KEY_ID = "env-key-id";
      process.env.CDP_API_KEY_SECRET = "env-key-secret";
      process.env.CDP_WALLET_SECRET = "env-wallet-secret";

      const result = resolveCredentials();

      expect(result).toEqual({
        apiKeyId: "env-key-id",
        apiKeySecret: "env-key-secret",
        walletSecret: "env-wallet-secret",
      });
    });

    it("prefers explicit config over environment variables", () => {
      process.env.CDP_API_KEY_ID = "env-key-id";
      process.env.CDP_API_KEY_SECRET = "env-key-secret";
      process.env.CDP_WALLET_SECRET = "env-wallet-secret";

      const result = resolveCredentials({
        apiKeyId: "explicit-key-id",
        apiKeySecret: "explicit-key-secret",
        walletSecret: "explicit-wallet-secret",
      });

      expect(result).toEqual({
        apiKeyId: "explicit-key-id",
        apiKeySecret: "explicit-key-secret",
        walletSecret: "explicit-wallet-secret",
      });
    });

    it("allows mixing explicit config and environment variables", () => {
      process.env.CDP_API_KEY_SECRET = "env-key-secret";
      process.env.CDP_WALLET_SECRET = "env-wallet-secret";

      const result = resolveCredentials({
        apiKeyId: "explicit-key-id",
      });

      expect(result).toEqual({
        apiKeyId: "explicit-key-id",
        apiKeySecret: "env-key-secret",
        walletSecret: "env-wallet-secret",
      });
    });

    it("throws when all credentials are missing", () => {
      delete process.env.CDP_API_KEY_ID;
      delete process.env.CDP_API_KEY_SECRET;
      delete process.env.CDP_WALLET_SECRET;

      expect(() => resolveCredentials()).toThrow(
        "Missing required CDP credentials: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET",
      );
    });

    it("throws when some credentials are missing", () => {
      process.env.CDP_API_KEY_ID = "env-key-id";
      delete process.env.CDP_API_KEY_SECRET;
      delete process.env.CDP_WALLET_SECRET;

      expect(() => resolveCredentials()).toThrow(
        "Missing required CDP credentials: CDP_API_KEY_SECRET, CDP_WALLET_SECRET",
      );
    });
  });

  describe("resolveWalletConfig", () => {
    it("defaults to cdp-eoa type with default account name", () => {
      const result = resolveWalletConfig();

      expect(result.type).toBe("cdp-eoa");
      expect(result.accountName).toBe("x402-server-wallet-1");
    });

    it("reads wallet type from CDP_WALLET_TYPE env var", () => {
      process.env.CDP_WALLET_TYPE = "cdp-smart";
      process.env.CDP_OWNER_ACCOUNT_NAME = "my-owner";

      const result = resolveWalletConfig();
      expect(result.type).toBe("cdp-smart");
    });

    it("explicit type overrides env var", () => {
      process.env.CDP_WALLET_TYPE = "cdp-smart";

      const result = resolveWalletConfig({ type: "cdp-eoa" });
      expect(result.type).toBe("cdp-eoa");
    });

    it("reads accountName from CDP_ACCOUNT_NAME env var", () => {
      process.env.CDP_ACCOUNT_NAME = "my-wallet";

      const result = resolveWalletConfig();
      expect(result.accountName).toBe("my-wallet");
    });

    it("reads ownerAccountName from CDP_OWNER_ACCOUNT_NAME env var", () => {
      process.env.CDP_WALLET_TYPE = "cdp-smart";
      process.env.CDP_OWNER_ACCOUNT_NAME = "my-owner";

      const result = resolveWalletConfig({ type: "cdp-smart" });
      expect(result.ownerAccountName).toBe("my-owner");
    });

    it("explicit config overrides env vars", () => {
      process.env.CDP_ACCOUNT_NAME = "env-wallet";
      process.env.CDP_OWNER_ACCOUNT_NAME = "env-owner";

      const result = resolveWalletConfig({
        type: "cdp-smart",
        accountName: "explicit-wallet",
        ownerAccountName: "explicit-owner",
      });

      expect(result.accountName).toBe("explicit-wallet");
      expect(result.ownerAccountName).toBe("explicit-owner");
    });

    it("throws for unsupported wallet type values", () => {
      process.env.CDP_WALLET_TYPE = "cdp-samrt";
      expect(() => resolveWalletConfig()).toThrow('Unsupported wallet type "cdp-samrt"');
    });

    it("throws for cdp-smart type without ownerAccountName", () => {
      delete process.env.CDP_OWNER_ACCOUNT_NAME;

      expect(() => resolveWalletConfig({ type: "cdp-smart" })).toThrow(
        'Missing required owner account name for wallet type "cdp-smart"',
      );
    });
  });

  describe("constants", () => {
    it("has correct CDP facilitator URL", () => {
      expect(CDP_FACILITATOR_URL).toBe("https://api.cdp.coinbase.com/platform/v2/x402");
    });

    it("has correct facilitator endpoint paths", () => {
      expect(FACILITATOR_PATHS.verify).toBe("/platform/v2/x402/verify");
      expect(FACILITATOR_PATHS.settle).toBe("/platform/v2/x402/settle");
      expect(FACILITATOR_PATHS.supported).toBe("/platform/v2/x402/supported");
    });
  });
});
