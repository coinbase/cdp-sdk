import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockedFunction } from "vitest";

// ─── Mock @x402/core/client ───────────────────────────────────────────────────
vi.mock("@x402/core/client", () => {
  class MockX402Client {
    private _beforeHooks: Array<(...args: unknown[]) => unknown> = [];
    private _schemes: Map<string, unknown> = new Map();
    register(network: string, scheme: unknown) {
      this._schemes.set(network, scheme);
      return this;
    }
    onBeforePaymentCreation(hook: (...args: unknown[]) => unknown) {
      this._beforeHooks.push(hook);
      return this;
    }
    async createPaymentPayload(paymentRequired: unknown) {
      return { mockPayload: true, paymentRequired };
    }
  }
  return { x402Client: MockX402Client };
});

// ─── Mock @x402/evm/exact/client ─────────────────────────────────────────────
vi.mock("@x402/evm/exact/client", () => ({
  registerExactEvmScheme: vi.fn().mockReturnValue(undefined),
}));

// ─── Mock @x402/evm/upto/client ──────────────────────────────────────────────
vi.mock("@x402/evm/upto/client", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({ scheme: "upto" })),
}));

// ─── Mock @x402/svm/exact/client ─────────────────────────────────────────────
vi.mock("@x402/svm/exact/client", () => ({
  registerExactSvmScheme: vi.fn().mockReturnValue(undefined),
}));

// ─── Mock wallets provisioning ────────────────────────────────────────────────
vi.mock("../wallets.js", () => ({
  provisionCdpAccounts: vi.fn().mockResolvedValue({
    cdpClient: { evm: {}, solana: {} },
    evmAddress: "0xabc123" as `0x${string}`,
    svmAddress: "SvmAddr123",
    ownerWallet: undefined,
    evmSigner: { address: "0xabc123", signTypedData: vi.fn() },
    svmSigner: { address: "SvmAddr123", signTransactions: vi.fn() },
  }),
}));

// ─── Mock balance check ───────────────────────────────────────────────────────
vi.mock("../balance-check.js", () => ({
  createBalanceCheckHook: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(undefined)),
}));

import { CdpX402Client, createCdpX402Client } from "../client.js";
import { provisionCdpAccounts } from "../wallets.js";
import { createBalanceCheckHook } from "../balance-check.js";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";

const mockedProvision = provisionCdpAccounts as MockedFunction<typeof provisionCdpAccounts>;
const mockedBalanceCheck = createBalanceCheckHook as MockedFunction<typeof createBalanceCheckHook>;
const mockedRegisterEvm = registerExactEvmScheme as MockedFunction<typeof registerExactEvmScheme>;
const mockedRegisterSvm = registerExactSvmScheme as MockedFunction<typeof registerExactSvmScheme>;
const MockedUptoScheme = UptoEvmScheme as unknown as MockedFunction<typeof UptoEvmScheme>;

describe("CdpX402Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CDP_API_KEY_ID: "test-key-id",
      CDP_API_KEY_SECRET: "test-key-secret",
      CDP_WALLET_SECRET: "test-wallet-secret",
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor config", () => {
    it("creates a CdpX402Client instance without throwing", () => {
      expect(() => new CdpX402Client()).not.toThrow();
    });

    it("accepts explicit config", () => {
      expect(
        () =>
          new CdpX402Client({
            apiKeyId: "id",
            apiKeySecret: "secret",
            walletSecret: "wallet",
          }),
      ).not.toThrow();
    });

    it("does not provision accounts at construction time", () => {
      new CdpX402Client();
      expect(mockedProvision).not.toHaveBeenCalled();
    });
  });

  describe("lazy initialization", () => {
    it("provisions accounts on first createPaymentPayload call", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload({ scheme: "exact", network: "eip155:8453" } as never);
      expect(mockedProvision).toHaveBeenCalledOnce();
    });

    it("provisions accounts only once for multiple createPaymentPayload calls", async () => {
      const client = new CdpX402Client();
      const req = { scheme: "exact", network: "eip155:8453" } as never;
      await client.createPaymentPayload(req);
      await client.createPaymentPayload(req);
      await client.createPaymentPayload(req);
      expect(mockedProvision).toHaveBeenCalledOnce();
    });

    it("retries provisioning after a transient failure", async () => {
      mockedProvision.mockRejectedValueOnce(new Error("transient error")).mockResolvedValueOnce({
        cdpClient: {},
        evmAddress: "0xretry" as `0x${string}`,
        svmAddress: "SvmRetry",
        ownerWallet: undefined,
        evmSigner: { address: "0xretry", signTypedData: vi.fn() },
        svmSigner: { address: "SvmRetry", signTransactions: vi.fn() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const client = new CdpX402Client();
      const req = { scheme: "exact", network: "eip155:8453" } as never;

      await expect(client.createPaymentPayload(req)).rejects.toThrow("transient error");
      await expect(client.createPaymentPayload(req)).resolves.toBeDefined();
      expect(mockedProvision).toHaveBeenCalledTimes(2);
    });
  });

  describe("payment signing path", () => {
    it("registers EVM and SVM schemes after initialization", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload({ scheme: "exact", network: "eip155:8453" } as never);
      expect(mockedRegisterEvm).toHaveBeenCalledOnce();
      expect(mockedRegisterSvm).toHaveBeenCalledOnce();
      expect(MockedUptoScheme).toHaveBeenCalledOnce();
    });

    it("wires the balance check hook by default", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload({ scheme: "exact", network: "eip155:8453" } as never);
      expect(mockedBalanceCheck).toHaveBeenCalledOnce();
    });

    it("skips balance check when disablePreflightBalanceCheck is true", async () => {
      const client = new CdpX402Client({ disablePreflightBalanceCheck: true });
      await client.createPaymentPayload({ scheme: "exact", network: "eip155:8453" } as never);
      expect(mockedBalanceCheck).not.toHaveBeenCalled();
    });

    it("skips balance check when CDP_DISABLE_PREFLIGHT_BALANCE_CHECK=true", async () => {
      process.env.CDP_DISABLE_PREFLIGHT_BALANCE_CHECK = "true";
      const client = new CdpX402Client();
      await client.createPaymentPayload({ scheme: "exact", network: "eip155:8453" } as never);
      expect(mockedBalanceCheck).not.toHaveBeenCalled();
      delete process.env.CDP_DISABLE_PREFLIGHT_BALANCE_CHECK;
    });
  });

  describe("getEvmAddress", () => {
    it("triggers initialization and returns the EVM address", async () => {
      const client = new CdpX402Client();
      const address = await client.getEvmAddress();
      expect(address).toBe("0xabc123");
    });

    it("does not re-initialize on second call", async () => {
      const client = new CdpX402Client();
      await client.getEvmAddress();
      await client.getEvmAddress();
      expect(mockedProvision).toHaveBeenCalledOnce();
    });
  });

  describe("getSvmAddress", () => {
    it("triggers initialization and returns the SVM address", async () => {
      const client = new CdpX402Client();
      const address = await client.getSvmAddress();
      expect(address).toBe("SvmAddr123");
    });
  });

  describe("RPC URL override behavior", () => {
    it("passes explicit rpcUrls config to balance check hook", async () => {
      const rpcUrls = { "eip155:137": { rpcUrl: "https://polygon.rpc" } };
      const client = new CdpX402Client({ rpcUrls });
      await client.createPaymentPayload({ scheme: "exact", network: "eip155:8453" } as never);
      expect(mockedBalanceCheck).toHaveBeenCalledWith(
        expect.objectContaining({ rpcUrls: expect.objectContaining(rpcUrls) }),
      );
    });

    it("merges env-var rpcUrls with explicit config (explicit wins)", async () => {
      process.env.CDP_X402_RPC_URLS = JSON.stringify({
        "eip155:8453": "https://env-base.rpc",
        "eip155:137": "https://env-polygon.rpc",
      });
      const rpcUrls = { "eip155:8453": { rpcUrl: "https://config-base.rpc" } };
      const client = new CdpX402Client({ rpcUrls });
      await client.createPaymentPayload({ scheme: "exact", network: "eip155:8453" } as never);
      expect(mockedBalanceCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: expect.objectContaining({
            "eip155:8453": { rpcUrl: "https://config-base.rpc" }, // explicit wins
            "eip155:137": { rpcUrl: "https://env-polygon.rpc" }, // env fills the rest
          }),
        }),
      );
      delete process.env.CDP_X402_RPC_URLS;
    });
  });
});

describe("createCdpX402Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CDP_API_KEY_ID: "test-key-id",
      CDP_API_KEY_SECRET: "test-key-secret",
      CDP_WALLET_SECRET: "test-wallet-secret",
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns a result with evmAddress, svmAddress, and client", async () => {
    const result = await createCdpX402Client();
    expect(result.evmAddress).toBe("0xabc123");
    expect(result.svmAddress).toBe("SvmAddr123");
    expect(result.client).toBeDefined();
    expect(result.cdpClient).toBeDefined();
  });

  it("provisions accounts eagerly on call", async () => {
    await createCdpX402Client();
    expect(mockedProvision).toHaveBeenCalledOnce();
  });

  it("accepts optional config", async () => {
    await createCdpX402Client({
      apiKeyId: "id",
      apiKeySecret: "secret",
      walletSecret: "wallet",
    });
    expect(mockedProvision).toHaveBeenCalledOnce();
  });
});
