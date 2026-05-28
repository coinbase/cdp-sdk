/**
 * Integration tests for core config and credential resolution.
 *
 * These run without any mocking and verify real env-var reading behavior.
 * No CDP credentials required.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveCredentials, resolveWalletConfig } from "../../src/core/index.js";

describe("resolveWalletConfig (integration)", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env = { ...saved };
    delete process.env.CDP_WALLET_TYPE;
    delete process.env.CDP_ACCOUNT_NAME;
    delete process.env.CDP_OWNER_ACCOUNT_NAME;
  });

  afterEach(() => {
    process.env = saved;
  });

  it("defaults to cdp-eoa with the default account name", () => {
    const cfg = resolveWalletConfig();
    expect(cfg.type).toBe("cdp-eoa");
    expect(cfg.accountName).toBe("x402-server-wallet-1");
  });

  it("reads CDP_WALLET_TYPE from env", () => {
    process.env.CDP_WALLET_TYPE = "cdp-smart";
    process.env.CDP_OWNER_ACCOUNT_NAME = "my-owner";
    const cfg = resolveWalletConfig();
    expect(cfg.type).toBe("cdp-smart");
  });

  it("reads CDP_ACCOUNT_NAME from env", () => {
    process.env.CDP_ACCOUNT_NAME = "my-account";
    const cfg = resolveWalletConfig();
    expect(cfg.accountName).toBe("my-account");
  });

  it("explicit config overrides env vars", () => {
    process.env.CDP_ACCOUNT_NAME = "env-account";
    const cfg = resolveWalletConfig({ accountName: "explicit-account" });
    expect(cfg.accountName).toBe("explicit-account");
  });

  it("throws for cdp-smart type without ownerAccountName", () => {
    expect(() => resolveWalletConfig({ type: "cdp-smart" })).toThrow(
      "Missing required owner account name",
    );
  });
});

describe("resolveCredentials (integration)", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env = { ...saved };
    delete process.env.CDP_API_KEY_ID;
    delete process.env.CDP_API_KEY_SECRET;
    delete process.env.CDP_WALLET_SECRET;
    delete process.env.CDP_WALLET_TYPE;
  });

  afterEach(() => {
    process.env = saved;
  });

  it("resolves credentials from environment variables", () => {
    process.env.CDP_API_KEY_ID = "test-id";
    process.env.CDP_API_KEY_SECRET = "test-secret";
    process.env.CDP_WALLET_SECRET = "test-wallet";

    const creds = resolveCredentials();
    expect(creds.apiKeyId).toBe("test-id");
    expect(creds.apiKeySecret).toBe("test-secret");
    expect(creds.walletSecret).toBe("test-wallet");
  });

  it("explicit config overrides env vars", () => {
    process.env.CDP_API_KEY_ID = "env-id";
    process.env.CDP_API_KEY_SECRET = "env-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet";

    const creds = resolveCredentials({
      apiKeyId: "explicit-id",
      apiKeySecret: "explicit-secret",
    });
    expect(creds.apiKeyId).toBe("explicit-id");
    expect(creds.apiKeySecret).toBe("explicit-secret");
  });

  it("throws with all missing field names listed", () => {
    expect(() => resolveCredentials()).toThrow(
      "CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET",
    );
  });
});
