import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../client/cdp.js", () => {
  const mockEvmAccount = {
    address: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
    signTypedData: vi.fn().mockResolvedValue("0xmocksig"),
  };

  const mockSmartAccount = {
    address: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
    signTypedData: vi.fn().mockResolvedValue("0xscwsig"),
    type: "evm-smart",
  };

  const mockSvmAccount = {
    address: "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu",
    signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
  };

  return {
    CdpClient: vi.fn().mockImplementation(() => ({
      evm: {
        getOrCreateAccount: vi.fn().mockResolvedValue(mockEvmAccount),
        getOrCreateSmartAccount: vi.fn().mockResolvedValue(mockSmartAccount),
        listSmartAccounts: vi.fn().mockResolvedValue({
          accounts: [{ address: mockSmartAccount.address, owners: [mockEvmAccount.address] }],
          nextPageToken: undefined,
        }),
        getSmartAccount: vi.fn().mockResolvedValue(mockSmartAccount),
        listTokenBalances: vi.fn().mockResolvedValue({ balances: [], nextPageToken: undefined }),
      },
      solana: {
        getOrCreateAccount: vi.fn().mockResolvedValue(mockSvmAccount),
        listTokenBalances: vi.fn().mockResolvedValue({ balances: [], nextPageToken: undefined }),
      },
    })),
  };
});

const mockClientRegister = vi.fn().mockReturnThis();

vi.mock("@x402/core/client", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockX402Client: any = vi.fn().mockImplementation(function (this: any) {
    this._schemes = {};
    this.register = mockClientRegister;
    this.policies = [];
    this.beforeHooks = [];
    this.afterHooks = [];
    this.failureHooks = [];
  });
  MockX402Client.prototype.createPaymentPayload = vi.fn().mockResolvedValue({
    x402Version: 2,
    payload: {},
    accepted: {},
  });
  MockX402Client.prototype.registerPolicy = vi.fn().mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function (this: any, p: any) {
      this.policies.push(p);
      return this;
    },
  );
  MockX402Client.prototype.onBeforePaymentCreation = vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation(function (this: any, h: any) {
      this.beforeHooks.push(h);
      return this;
    });
  MockX402Client.prototype.onAfterPaymentCreation = vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation(function (this: any, h: any) {
      this.afterHooks.push(h);
      return this;
    });
  MockX402Client.prototype.onPaymentCreationFailure = vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation(function (this: any, h: any) {
      this.failureHooks.push(h);
      return this;
    });
  return { x402Client: MockX402Client };
});

vi.mock("@x402/evm/exact/client", () => ({
  registerExactEvmScheme: vi.fn(),
}));

vi.mock("@x402/evm/upto/client", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({ scheme: "upto" })),
}));

vi.mock("@x402/svm/exact/client", () => ({
  registerExactSvmScheme: vi.fn(),
}));

vi.mock("../wallets/evm-signer.js", () => ({
  fromCdpEvmAccount: vi.fn().mockImplementation((account) => ({
    address: account.address,
    signTypedData: account.signTypedData,
  })),
}));

vi.mock("../wallets/scw-signer.js", () => ({
  fromCdpSmartWallet: vi.fn().mockImplementation((account) => ({
    address: account.address,
    signTypedData: account.signTypedData,
  })),
  cdpSmartAccountToEvmSigner: vi.fn(),
  resolveNetworkFromChainId: vi.fn(),
}));

vi.mock("../wallets/svm-signer.js", () => ({
  cdpSolanaAccountToSvmSigner: vi.fn().mockImplementation((account) => ({
    address: account.address,
    signTransactions: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("@solana/kit", () => ({
  address: (addr: string) => addr,
  getTransactionEncoder: () => ({
    encode: () => new Uint8Array(75),
  }),
}));

import { CdpX402Client, createCdpX402Client } from "./index.js";
import { CdpClient } from "../../client/cdp.js";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { fromCdpEvmAccount } from "../wallets/evm-signer.js";
import { fromCdpSmartWallet } from "../wallets/scw-signer.js";

const MOCK_EVM_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
const MOCK_SCW_ADDRESS = "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;
const MOCK_SVM_ADDRESS = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu";

describe("client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      CDP_API_KEY_ID: "test-key-id",
      CDP_API_KEY_SECRET: "test-key-secret",
      CDP_WALLET_SECRET: "test-wallet-secret",
      CDP_WALLET_TYPE: "cdp-eoa",
    };
    delete process.env.CDP_ACCOUNT_NAME;
    delete process.env.CDP_OWNER_ACCOUNT_NAME;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createCdpX402Client (cdp-eoa)", () => {
    it("creates a CdpClient with resolved credentials", async () => {
      await createCdpX402Client();
      expect(CdpClient).toHaveBeenCalledWith({
        apiKeyId: "test-key-id",
        apiKeySecret: "test-key-secret",
        walletSecret: "test-wallet-secret",
      });
    });

    it("uses the default account name when none is provided", async () => {
      await createCdpX402Client();
      const cdpInstance = (CdpClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(cdpInstance.evm.getOrCreateAccount).toHaveBeenCalledWith({
        name: "x402-server-wallet-1",
      });
    });

    it("uses a custom account name from walletConfig", async () => {
      await createCdpX402Client({ walletConfig: { accountName: "my-wallet" } });
      const cdpInstance = (CdpClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(cdpInstance.evm.getOrCreateAccount).toHaveBeenCalledWith({ name: "my-wallet" });
    });

    it("uses account name from CDP_ACCOUNT_NAME env var", async () => {
      process.env.CDP_ACCOUNT_NAME = "env-wallet";
      await createCdpX402Client();
      const cdpInstance = (CdpClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(cdpInstance.evm.getOrCreateAccount).toHaveBeenCalledWith({ name: "env-wallet" });
    });

    it("returns the correct EVM and SVM addresses", async () => {
      const result = await createCdpX402Client();
      expect(result.evmAddress).toBe(MOCK_EVM_ADDRESS);
      expect(result.svmAddress).toBe(MOCK_SVM_ADDRESS);
    });

    it("does not set ownerWallet for EOA", async () => {
      const result = await createCdpX402Client();
      expect(result.ownerWallet).toBeUndefined();
    });

    it("registers exact EVM, exact SVM, and upto EVM schemes", async () => {
      await createCdpX402Client();
      expect(registerExactEvmScheme).toHaveBeenCalled();
      expect(registerExactSvmScheme).toHaveBeenCalled();
      expect(mockClientRegister).toHaveBeenCalledWith(
        "eip155:*",
        expect.objectContaining({ scheme: "upto" }),
      );
    });

    it("instantiates UptoEvmScheme with the EVM signer and default RPC URLs", async () => {
      await createCdpX402Client();
      expect(UptoEvmScheme).toHaveBeenCalledWith(
        expect.objectContaining({ address: MOCK_EVM_ADDRESS }),
        expect.objectContaining({
          8453: expect.objectContaining({ rpcUrl: expect.stringContaining("base.org") }),
          84532: expect.objectContaining({ rpcUrl: expect.stringContaining("base.org") }),
          137: expect.objectContaining({ rpcUrl: expect.any(String) }),
          42161: expect.objectContaining({ rpcUrl: expect.any(String) }),
          480: expect.objectContaining({ rpcUrl: expect.any(String) }),
          4801: expect.objectContaining({ rpcUrl: expect.any(String) }),
        }),
      );
    });

    it("uses fromCdpEvmAccount for the EVM signer", async () => {
      await createCdpX402Client();
      expect(fromCdpEvmAccount).toHaveBeenCalledWith(
        expect.objectContaining({ address: MOCK_EVM_ADDRESS }),
      );
    });

    it("picks up RPC URL overrides from CDP_RPC_URLS env var", async () => {
      process.env.CDP_RPC_URLS = JSON.stringify({
        "eip155:8453": "https://custom-base-rpc.example.com",
      });
      try {
        await createCdpX402Client();
        expect(UptoEvmScheme).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            8453: expect.objectContaining({ rpcUrl: "https://custom-base-rpc.example.com" }),
          }),
        );
      } finally {
        delete process.env.CDP_RPC_URLS;
      }
    });

    it("gives explicit rpcUrls config precedence over CDP_RPC_URLS env var", async () => {
      process.env.CDP_RPC_URLS = JSON.stringify({
        "eip155:8453": "https://env-rpc.example.com",
      });
      try {
        await createCdpX402Client({
          rpcUrls: { "eip155:8453": { rpcUrl: "https://config-rpc.example.com" } },
        });
        expect(UptoEvmScheme).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            8453: expect.objectContaining({ rpcUrl: "https://config-rpc.example.com" }),
          }),
        );
      } finally {
        delete process.env.CDP_RPC_URLS;
      }
    });

    it("exposes the cdpClient in the result", async () => {
      const result = await createCdpX402Client();
      expect(result.cdpClient).toBeDefined();
    });
  });

  describe("createCdpX402Client (cdp-smart)", () => {
    const scwConfig = {
      walletConfig: { type: "cdp-smart" as const, ownerAccountName: "my-owner" },
    };

    it("provisions an owner EOA and a smart account", async () => {
      await createCdpX402Client(scwConfig);
      const cdpInstance = (CdpClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(cdpInstance.evm.getOrCreateAccount).toHaveBeenCalledWith({ name: "my-owner" });
      expect(cdpInstance.evm.getOrCreateSmartAccount).toHaveBeenCalledWith(
        expect.objectContaining({ name: "x402-server-wallet-1" }),
      );
    });

    it("uses ownerAccountName from CDP_OWNER_ACCOUNT_NAME env var", async () => {
      process.env.CDP_OWNER_ACCOUNT_NAME = "env-owner";
      await createCdpX402Client({ walletConfig: { type: "cdp-smart" } });
      const cdpInstance = (CdpClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(cdpInstance.evm.getOrCreateAccount).toHaveBeenCalledWith({ name: "env-owner" });
    });

    it("returns the SCW address as evmAddress and the owner account name as ownerWallet", async () => {
      const result = await createCdpX402Client(scwConfig);
      expect(result.evmAddress).toBe(MOCK_SCW_ADDRESS);
      expect(result.ownerWallet).toBe("my-owner");
    });

    it("uses fromCdpSmartWallet for the EVM signer", async () => {
      await createCdpX402Client(scwConfig);
      expect(fromCdpSmartWallet).toHaveBeenCalledWith(
        expect.objectContaining({ address: MOCK_SCW_ADDRESS }),
      );
    });

    it("does not call getOrCreateSmartAccount for cdp-eoa type", async () => {
      await createCdpX402Client();
      const cdpInstance = (CdpClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(cdpInstance.evm.getOrCreateSmartAccount).not.toHaveBeenCalled();
    });

    it("recovers from duplicate-owner error via getOrCreateSmartAccount internal recovery", async () => {
      // Recovery from "multiple owners" is handled inside getOrCreateSmartAccount itself.
      // Provision simply calls getOrCreateSmartAccount and returns whatever it resolves to.
      (CdpClient as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        evm: {
          getOrCreateAccount: vi.fn().mockResolvedValue({
            address: MOCK_EVM_ADDRESS,
            signTypedData: vi.fn(),
          }),
          getOrCreateSmartAccount: vi.fn().mockResolvedValue({
            address: MOCK_SCW_ADDRESS,
            signTypedData: vi.fn(),
          }),
          listTokenBalances: vi.fn().mockResolvedValue({ balances: [], nextPageToken: undefined }),
        },
        solana: {
          getOrCreateAccount: vi.fn().mockResolvedValue({
            address: MOCK_SVM_ADDRESS,
            signTransaction: vi.fn(),
          }),
        },
      }));

      const result = await createCdpX402Client(scwConfig);

      expect(result.evmAddress).toBe(MOCK_SCW_ADDRESS);
      const cdpInstance = (CdpClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(cdpInstance.evm.getOrCreateSmartAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe("CdpX402Client", () => {
    const mockPaymentRequired = {
      x402Version: 2,
      accepts: [{ network: "eip155:84532", scheme: "exact" }],
      error: "",
      resource: "https://api.example.com/paid",
    };

    it("constructs without throwing (no init yet)", () => {
      expect(() => new CdpX402Client()).not.toThrow();
    });

    it("initializes lazily on createPaymentPayload (cdp-eoa)", async () => {
      const client = new CdpX402Client();
      expect(CdpClient).not.toHaveBeenCalled();

      await client.createPaymentPayload(mockPaymentRequired as never);
      expect(CdpClient).toHaveBeenCalled();
    });

    it("only initializes once across multiple calls", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired as never);
      await client.createPaymentPayload(mockPaymentRequired as never);
      expect(CdpClient).toHaveBeenCalledTimes(1);
    });

    it("resets and retries after a transient failure", async () => {
      const cdpClientMock = CdpClient as ReturnType<typeof vi.fn>;
      cdpClientMock.mockImplementationOnce(() => {
        throw new Error("transient error");
      });

      const client = new CdpX402Client();
      await expect(client.createPaymentPayload(mockPaymentRequired as never)).rejects.toThrow(
        "transient error",
      );

      await expect(
        client.createPaymentPayload(mockPaymentRequired as never),
      ).resolves.toBeDefined();
      expect(cdpClientMock).toHaveBeenCalledTimes(2);
    });

    it("uses fromCdpSmartWallet for cdp-smart type", async () => {
      const client = new CdpX402Client({
        walletConfig: { type: "cdp-smart", ownerAccountName: "my-owner" },
      });
      await client.createPaymentPayload(mockPaymentRequired as never);
      expect(fromCdpSmartWallet).toHaveBeenCalled();
    });

    it("reads wallet type from CDP_WALLET_TYPE env var", async () => {
      process.env.CDP_WALLET_TYPE = "cdp-eoa";
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired as never);
      expect(fromCdpEvmAccount).toHaveBeenCalled();
    });

    it("registers upto EVM scheme during lazy init", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired as never);
      expect(mockClientRegister).toHaveBeenCalledWith(
        "eip155:*",
        expect.objectContaining({ scheme: "upto" }),
      );
    });
  });

  describe("CdpX402Client with spendControls", () => {
    const mockPaymentRequired = {
      x402Version: 2,
      accepts: [{ network: "eip155:84532", scheme: "exact" }],
      error: "",
      resource: "https://api.example.com/paid",
    };

    it("registers a policy and before/after hooks when spendControls is set", async () => {
      const client = new CdpX402Client({
        spendControls: {
          maxAmountPerPayment: { atomic: 1_000_000n, asset: "usdc" },
          allowedNetworks: ["eip155:84532"],
        },
        disablePreflightBalanceCheck: true,
      });
      await client.createPaymentPayload(mockPaymentRequired as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Mock = (await import("@x402/core/client")).x402Client as any;
      const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
      expect(lastInstance.policies).toHaveLength(1);
      expect(lastInstance.beforeHooks).toHaveLength(1);
      expect(lastInstance.afterHooks).toHaveLength(1);
    });

    it("is a no-op when spendControls is omitted", async () => {
      const client = new CdpX402Client({ disablePreflightBalanceCheck: true });
      await client.createPaymentPayload(mockPaymentRequired as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Mock = (await import("@x402/core/client")).x402Client as any;
      const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
      expect(lastInstance.policies).toHaveLength(0);
      expect(lastInstance.beforeHooks).toHaveLength(0);
      expect(lastInstance.afterHooks).toHaveLength(0);
    });
  });

  describe("createCdpX402Client with spendControls", () => {
    it("registers a policy and before/after hooks when spendControls is set", async () => {
      await createCdpX402Client({
        spendControls: {
          maxCumulativeSpend: { atomic: 5_000_000n, asset: "usdc" },
          maxCumulativeSpendWindow: "24h",
        },
        disablePreflightBalanceCheck: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Mock = (await import("@x402/core/client")).x402Client as any;
      const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
      expect(lastInstance.policies).toHaveLength(1);
      expect(lastInstance.beforeHooks).toHaveLength(1);
      expect(lastInstance.afterHooks).toHaveLength(1);
    });

    it("is a no-op when spendControls is omitted", async () => {
      await createCdpX402Client({ disablePreflightBalanceCheck: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Mock = (await import("@x402/core/client")).x402Client as any;
      const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
      expect(lastInstance.policies).toHaveLength(0);
      expect(lastInstance.beforeHooks).toHaveLength(0);
      expect(lastInstance.afterHooks).toHaveLength(0);
    });
  });

  describe("pre-flight balance check", () => {
    it("registers a balance check before-hook by default", async () => {
      await createCdpX402Client();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Mock = (await import("@x402/core/client")).x402Client as any;
      const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
      expect(lastInstance.beforeHooks).toHaveLength(1);
    });

    it("does not register a balance check when disablePreflightBalanceCheck is true", async () => {
      await createCdpX402Client({ disablePreflightBalanceCheck: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Mock = (await import("@x402/core/client")).x402Client as any;
      const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
      expect(lastInstance.beforeHooks).toHaveLength(0);
    });

    it("does not register a balance check when CDP_DISABLE_PREFLIGHT_BALANCE_CHECK=true", async () => {
      process.env.CDP_DISABLE_PREFLIGHT_BALANCE_CHECK = "true";
      try {
        await createCdpX402Client();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const x402Mock = (await import("@x402/core/client")).x402Client as any;
        const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
        expect(lastInstance.beforeHooks).toHaveLength(0);
      } finally {
        delete process.env.CDP_DISABLE_PREFLIGHT_BALANCE_CHECK;
      }
    });

    it("registers balance check before spendControls hooks (so it short-circuits first)", async () => {
      await createCdpX402Client({
        spendControls: {
          maxAmountPerPayment: { atomic: 1_000_000n, asset: "usdc" },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Mock = (await import("@x402/core/client")).x402Client as any;
      const lastInstance = x402Mock.mock.instances[x402Mock.mock.instances.length - 1];
      expect(lastInstance.beforeHooks).toHaveLength(2);
    });
  });
});

// ---------------------------------------------------------------------------
// wrapFetch() convenience method
// ---------------------------------------------------------------------------

vi.mock("../guardrails/wrap-fetch.js", () => ({
  wrapFetchWithPayment: vi.fn().mockImplementation((_fetch, _client) => {
    return vi.fn().mockResolvedValue(new Response("paid", { status: 200 }));
  }),
}));

describe("CdpX402Client.wrapFetch()", () => {
  it("calls wrapFetchWithPayment with globalThis.fetch when no argument is given", async () => {
    const { wrapFetchWithPayment } = await import("../guardrails/wrap-fetch.js");
    const { CdpX402Client } = await import("./index.js");

    const client = new CdpX402Client();
    client.wrapFetch();

    expect(wrapFetchWithPayment).toHaveBeenCalledWith(globalThis.fetch, client);
  });

  it("forwards a custom fetch function to wrapFetchWithPayment", async () => {
    const { wrapFetchWithPayment } = await import("../guardrails/wrap-fetch.js");
    const { CdpX402Client } = await import("./index.js");

    const customFetch = vi.fn() as unknown as typeof globalThis.fetch;
    const client = new CdpX402Client();
    client.wrapFetch(customFetch);

    expect(wrapFetchWithPayment).toHaveBeenCalledWith(customFetch, client);
  });

  it("returns the wrapped fetch function produced by wrapFetchWithPayment", async () => {
    const { wrapFetchWithPayment } = await import("../guardrails/wrap-fetch.js");
    const wrappedFetchSentinel = vi.fn();
    vi.mocked(wrapFetchWithPayment).mockReturnValueOnce(wrappedFetchSentinel as never);

    const { CdpX402Client } = await import("./index.js");
    const client = new CdpX402Client();
    const result = client.wrapFetch();

    expect(result).toBe(wrappedFetchSentinel);
  });
});

describe("createCdpX402Client", () => {
  beforeEach(() => {
    process.env.CDP_API_KEY_ID = "test-key-id";
    process.env.CDP_API_KEY_SECRET = "test-key-secret";
    process.env.CDP_WALLET_SECRET = "test-wallet-secret";
  });

  afterEach(() => {
    delete process.env.CDP_API_KEY_ID;
    delete process.env.CDP_API_KEY_SECRET;
    delete process.env.CDP_WALLET_SECRET;
  });

  it("returns a client that works with wrapFetchWithPayment", async () => {
    const { wrapFetchWithPayment } = await import("../guardrails/wrap-fetch.js");
    const { createCdpX402Client } = await import("./index.js");

    const result = await createCdpX402Client();
    wrapFetchWithPayment(globalThis.fetch, result.client);

    expect(wrapFetchWithPayment).toHaveBeenCalledWith(globalThis.fetch, result.client);
  });
});
