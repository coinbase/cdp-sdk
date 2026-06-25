import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentPayload, PaymentRequired } from "@x402/core/types";

// ─── Hoisted mocks (shared between vi.mock factories and test assertions) ─────

const {
  mockCreatePaymentPayload,
  mockRegister,
  mockRegisterPolicy,
  mockOnBeforePaymentCreation,
  mockOnAfterPaymentCreation,
  mockOnPaymentCreationFailure,
  mockGetOrCreateAccount,
  mockGetOrCreateSmartAccount,
  mockListSmartAccounts,
  mockGetSmartAccount,
  mockSolanaGetOrCreateAccount,
  mockCreateBalanceCheckHook,
  MockCdpClient,
} = vi.hoisted(() => {
  const mockCreatePaymentPayload = vi.fn();
  const mockRegister = vi.fn();
  const mockRegisterPolicy = vi.fn();
  const mockOnBeforePaymentCreation = vi.fn().mockReturnThis();
  const mockOnAfterPaymentCreation = vi.fn().mockReturnThis();
  const mockOnPaymentCreationFailure = vi.fn().mockReturnThis();
  const mockGetOrCreateAccount = vi.fn();
  const mockGetOrCreateSmartAccount = vi.fn();
  const mockListSmartAccounts = vi.fn();
  const mockGetSmartAccount = vi.fn();
  const mockSolanaGetOrCreateAccount = vi.fn();
  const mockCreateBalanceCheckHook = vi.fn().mockReturnValue(vi.fn());

  const mockCdpClientInstance = {
    evm: {
      getOrCreateAccount: mockGetOrCreateAccount,
      getOrCreateSmartAccount: mockGetOrCreateSmartAccount,
      getSmartAccount: mockGetSmartAccount,
      listSmartAccounts: mockListSmartAccounts,
      listTokenBalances: vi.fn().mockResolvedValue({ balances: [], nextPageToken: undefined }),
    },
    solana: {
      getOrCreateAccount: mockSolanaGetOrCreateAccount,
      listTokenBalances: vi.fn().mockResolvedValue({ balances: [], nextPageToken: undefined }),
    },
  };
  const MockCdpClient = vi.fn().mockImplementation(() => mockCdpClientInstance);

  return {
    mockCreatePaymentPayload,
    mockRegister,
    mockRegisterPolicy,
    mockOnBeforePaymentCreation,
    mockOnAfterPaymentCreation,
    mockOnPaymentCreationFailure,
    mockGetOrCreateAccount,
    mockGetOrCreateSmartAccount,
    mockListSmartAccounts,
    mockGetSmartAccount,
    mockSolanaGetOrCreateAccount,
    mockCreateBalanceCheckHook,
    MockCdpClient,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@x402/core/client", () => {
  class MockX402Client {
    register(...args: unknown[]) {
      return mockRegister(...args);
    }

    registerPolicy(...args: unknown[]) {
      return mockRegisterPolicy(...args);
    }

    createPaymentPayload(...args: unknown[]) {
      return mockCreatePaymentPayload(...args);
    }

    onBeforePaymentCreation(...args: unknown[]) {
      return mockOnBeforePaymentCreation(...args);
    }

    onAfterPaymentCreation(...args: unknown[]) {
      return mockOnAfterPaymentCreation(...args);
    }

    onPaymentCreationFailure(...args: unknown[]) {
      return mockOnPaymentCreationFailure(...args);
    }
  }
  return {
    x402Client: MockX402Client,
    x402HTTPClient: vi.fn().mockImplementation(() => ({})),
  };
});

vi.mock("@x402/evm/exact/client", () => ({ registerExactEvmScheme: vi.fn() }));
vi.mock("@x402/evm/upto/client", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@x402/svm/exact/client", () => ({ registerExactSvmScheme: vi.fn() }));

vi.mock("../client/cdp.js", () => ({ CdpClient: MockCdpClient }));

vi.mock("./account-signers.js", () => ({
  fromCdpEvmAccount: vi.fn().mockReturnValue({ address: "0xEvm", signTypedData: vi.fn() }),
  fromCdpSmartWallet: vi.fn().mockReturnValue({ address: "0xScw", signTypedData: vi.fn() }),
  cdpSolanaAccountToSvmSigner: vi.fn().mockReturnValue({ address: "SolMock" }),
}));

vi.mock("./balance-check.js", () => ({
  createBalanceCheckHook: mockCreateBalanceCheckHook,
  InsufficientFundsError: class InsufficientFundsError extends Error {
    code = "insufficient_funds" as const;
    required = 0n;
    available = 0n;
    asset = "";
    network = "";
    address = "";
  },
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { CdpX402Client, createCdpX402Client } from "./client.js";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { createBalanceCheckHook } from "./balance-check.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_EVM_ADDRESS = "0xf00d000000000000000000000000000000000001" as `0x${string}`;
const MOCK_SVM_ADDRESS = "SolanaAddr1111111111111111111111111111111111";
const MOCK_SCW_ADDRESS = "0xscw0000000000000000000000000000000000001" as `0x${string}`;

const mockEvmAccount = { address: MOCK_EVM_ADDRESS, signTypedData: vi.fn() };
const mockSmartAccount = {
  address: MOCK_SCW_ADDRESS,
  owners: ["0xowner"],
  signTypedData: vi.fn(),
};
const mockSvmAccount = {
  address: MOCK_SVM_ADDRESS,
  signTransaction: vi.fn(),
};

const mockPayload: PaymentPayload = {
  x402Version: 2,
  resource: { url: "https://example.com/report" },
  accepted: {
    scheme: "exact",
    network: "eip155:84532",
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    amount: "10000",
    payTo: "0x0000000000000000000000000000000000000001",
    maxTimeoutSeconds: 300,
    extra: {},
  },
  payload: { signature: "0xmocksig" },
};

const mockPaymentRequired: PaymentRequired = {
  x402Version: 2,
  resource: { url: "https://example.com/report" },
  accepts: [mockPayload.accepted],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ENV_VARS = {
  CDP_API_KEY_ID: "test-api-key-id",
  CDP_API_KEY_SECRET: "test-api-key-secret",
  CDP_WALLET_SECRET: "test-wallet-secret",
};

function setEnv(vars: Record<string, string>) {
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
}

function clearEnv(keys: string[]) {
  for (const key of keys) {
    delete process.env[key];
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CdpX402Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv(ENV_VARS);
    mockGetOrCreateAccount.mockResolvedValue(mockEvmAccount);
    mockSolanaGetOrCreateAccount.mockResolvedValue(mockSvmAccount);
    mockCreatePaymentPayload.mockResolvedValue(mockPayload);
    mockCreateBalanceCheckHook.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    clearEnv([
      "CDP_API_KEY_ID",
      "CDP_API_KEY_SECRET",
      "CDP_WALLET_SECRET",
      "CDP_WALLET_TYPE",
      "CDP_ACCOUNT_NAME",
      "CDP_X402_RPC_URLS",
      "CDP_DISABLE_PREFLIGHT_BALANCE_CHECK",
      "CDP_OWNER_ACCOUNT_NAME",
    ]);
  });

  describe("constructor", () => {
    it("accepts no arguments — reads all config from env vars", () => {
      expect(() => new CdpX402Client()).not.toThrow();
    });

    it("accepts explicit config override", () => {
      expect(
        () =>
          new CdpX402Client({
            apiKeyId: "explicit-key",
            apiKeySecret: "explicit-secret",
            walletSecret: "explicit-wallet-secret",
          }),
      ).not.toThrow();
    });

    it("accepts smart wallet config", () => {
      expect(
        () =>
          new CdpX402Client({
            walletConfig: { type: "smart", ownerAccountName: "my-owner" },
          }),
      ).not.toThrow();
    });
  });

  describe("lazy initialization", () => {
    it("does not call CdpClient until createPaymentPayload is called", async () => {
      const client = new CdpX402Client();
      expect(MockCdpClient).not.toHaveBeenCalled();

      await client.createPaymentPayload(mockPaymentRequired);
      expect(MockCdpClient).toHaveBeenCalledTimes(1);
    });

    it("initializes only once across multiple createPaymentPayload calls", async () => {
      const client = new CdpX402Client();

      await client.createPaymentPayload(mockPaymentRequired);
      await client.createPaymentPayload(mockPaymentRequired);
      await client.createPaymentPayload(mockPaymentRequired);

      expect(MockCdpClient).toHaveBeenCalledTimes(1);
    });

    it("retries initialization after a transient failure", async () => {
      mockSolanaGetOrCreateAccount
        .mockRejectedValueOnce(new Error("transient network error"))
        .mockResolvedValue(mockSvmAccount);

      const client = new CdpX402Client();

      await expect(client.createPaymentPayload(mockPaymentRequired)).rejects.toThrow(
        "transient network error",
      );

      await expect(client.createPaymentPayload(mockPaymentRequired)).resolves.toBe(mockPayload);
      expect(MockCdpClient).toHaveBeenCalledTimes(2);
    });
  });

  describe("scheme registration", () => {
    it("registers exact EVM, Solana, and upto EVM schemes for EOA wallet", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(registerExactEvmScheme).toHaveBeenCalledTimes(1);
      expect(registerExactSvmScheme).toHaveBeenCalledTimes(1);
      expect(UptoEvmScheme).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith("eip155:*", expect.any(Object));
    });

    it("registers balance check hook by default", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(createBalanceCheckHook).toHaveBeenCalledTimes(1);
      expect(mockOnBeforePaymentCreation).toHaveBeenCalled();
    });

    it("skips balance check when disablePreflightBalanceCheck is true", async () => {
      const client = new CdpX402Client({ disablePreflightBalanceCheck: true });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(createBalanceCheckHook).not.toHaveBeenCalled();
    });

    it("skips balance check when CDP_DISABLE_PREFLIGHT_BALANCE_CHECK=true", async () => {
      process.env.CDP_DISABLE_PREFLIGHT_BALANCE_CHECK = "true";
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(createBalanceCheckHook).not.toHaveBeenCalled();
    });
  });

  describe("EOA wallet provisioning", () => {
    it("provisions EVM and Solana accounts with the default account name", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockGetOrCreateAccount).toHaveBeenCalledWith({ name: "x402-client-wallet-1" });
      expect(mockSolanaGetOrCreateAccount).toHaveBeenCalledWith({ name: "x402-client-wallet-1" });
    });

    it("uses custom accountName from config", async () => {
      const client = new CdpX402Client({
        walletConfig: { type: "eoa", accountName: "my-agent-wallet" },
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockGetOrCreateAccount).toHaveBeenCalledWith({ name: "my-agent-wallet" });
      expect(mockSolanaGetOrCreateAccount).toHaveBeenCalledWith({ name: "my-agent-wallet" });
    });

    it("uses CDP_ACCOUNT_NAME env var", async () => {
      process.env.CDP_ACCOUNT_NAME = "env-wallet";
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockGetOrCreateAccount).toHaveBeenCalledWith({ name: "env-wallet" });
    });
  });

  describe("smart wallet provisioning", () => {
    beforeEach(() => {
      mockGetOrCreateAccount
        .mockResolvedValueOnce({ address: "0xowner", signTypedData: vi.fn() })
        .mockResolvedValue(mockEvmAccount);
      mockGetOrCreateSmartAccount.mockResolvedValue(mockSmartAccount);
    });

    it("provisions a smart account when walletConfig.type is 'smart'", async () => {
      const client = new CdpX402Client({
        walletConfig: { type: "smart", ownerAccountName: "my-owner" },
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockGetOrCreateSmartAccount).toHaveBeenCalledWith({
        name: "x402-client-wallet-1",
        owner: expect.objectContaining({ address: "0xowner" }),
      });
    });

    it("uses CDP_WALLET_TYPE=smart env var", async () => {
      process.env.CDP_WALLET_TYPE = "smart";
      process.env.CDP_OWNER_ACCOUNT_NAME = "env-owner";

      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockGetOrCreateSmartAccount).toHaveBeenCalledTimes(1);
    });

    it("throws if smart wallet type is set but ownerAccountName is missing", async () => {
      delete process.env.CDP_OWNER_ACCOUNT_NAME;
      const client = new CdpX402Client({
        walletConfig: { type: "smart", ownerAccountName: "" },
      });
      await expect(client.createPaymentPayload(mockPaymentRequired)).rejects.toThrow(
        /Missing required owner account name/,
      );
    });
  });

  describe("credential validation", () => {
    it("throws when CDP_API_KEY_ID is missing", async () => {
      delete process.env.CDP_API_KEY_ID;
      const client = new CdpX402Client();
      await expect(client.createPaymentPayload(mockPaymentRequired)).rejects.toThrow(
        /Missing required CDP credentials.*CDP_API_KEY_ID/,
      );
    });

    it("throws when CDP_WALLET_SECRET is missing", async () => {
      delete process.env.CDP_WALLET_SECRET;
      const client = new CdpX402Client();
      await expect(client.createPaymentPayload(mockPaymentRequired)).rejects.toThrow(
        /Missing required CDP credentials.*CDP_WALLET_SECRET/,
      );
    });

    it("prefers explicit config over env vars", async () => {
      const client = new CdpX402Client({
        apiKeyId: "explicit-id",
        apiKeySecret: "explicit-secret",
        walletSecret: "explicit-wallet-secret",
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(MockCdpClient).toHaveBeenCalledWith({
        apiKeyId: "explicit-id",
        apiKeySecret: "explicit-secret",
        walletSecret: "explicit-wallet-secret",
      });
    });
  });

  describe("RPC URL override behavior", () => {
    it("passes RPC URL overrides from config to balance check hook", async () => {
      const rpcUrls = { "eip155:8453": { rpcUrl: "https://my-rpc.example.com" } };
      const client = new CdpX402Client({ rpcUrls });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(createBalanceCheckHook).toHaveBeenCalledWith(
        expect.objectContaining({ rpcUrls }),
      );
    });

    it("parses CDP_X402_RPC_URLS env var", async () => {
      process.env.CDP_X402_RPC_URLS = '{"eip155:8453":"https://custom-rpc.example.com"}';
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(createBalanceCheckHook).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: expect.objectContaining({
            "eip155:8453": { rpcUrl: "https://custom-rpc.example.com" },
          }),
        }),
      );
    });

    it("throws on invalid CDP_X402_RPC_URLS JSON", async () => {
      process.env.CDP_X402_RPC_URLS = "not-valid-json";
      const client = new CdpX402Client();
      await expect(client.createPaymentPayload(mockPaymentRequired)).rejects.toThrow(
        /CDP_X402_RPC_URLS must be valid JSON/,
      );
    });

    it("explicit rpcUrls config takes precedence over CDP_X402_RPC_URLS env var", async () => {
      process.env.CDP_X402_RPC_URLS = '{"eip155:8453":"https://env-rpc.example.com"}';
      const rpcUrls = { "eip155:8453": { rpcUrl: "https://config-rpc.example.com" } };
      const client = new CdpX402Client({ rpcUrls });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(createBalanceCheckHook).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: expect.objectContaining({
            "eip155:8453": { rpcUrl: "https://config-rpc.example.com" },
          }),
        }),
      );
    });
  });

  describe("wrapFetch", () => {
    it("returns a function", () => {
      const client = new CdpX402Client();
      const wrapped = client.wrapFetch();
      expect(typeof wrapped).toBe("function");
    });

    it("accepts a custom fetch function", () => {
      const customFetch = vi.fn() as unknown as typeof fetch;
      const client = new CdpX402Client();
      const wrapped = client.wrapFetch(customFetch);
      expect(typeof wrapped).toBe("function");
    });
  });
});

// ─── createCdpX402Client ──────────────────────────────────────────────────────

describe("createCdpX402Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv(ENV_VARS);
    mockGetOrCreateAccount.mockResolvedValue(mockEvmAccount);
    mockSolanaGetOrCreateAccount.mockResolvedValue(mockSvmAccount);
    mockCreatePaymentPayload.mockResolvedValue(mockPayload);
    mockCreateBalanceCheckHook.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    clearEnv(["CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET", "CDP_WALLET_TYPE"]);
  });

  it("returns client, cdpClient, evmAddress, and svmAddress", async () => {
    const result = await createCdpX402Client();

    expect(result).toMatchObject({
      client: expect.any(Object),
      cdpClient: expect.any(Object),
      evmAddress: MOCK_EVM_ADDRESS,
      svmAddress: MOCK_SVM_ADDRESS,
    });
    expect(result.ownerWallet).toBeUndefined();
  });

  it("registers EVM and Solana schemes eagerly", async () => {
    await createCdpX402Client();

    expect(registerExactEvmScheme).toHaveBeenCalledTimes(1);
    expect(registerExactSvmScheme).toHaveBeenCalledTimes(1);
  });
});
