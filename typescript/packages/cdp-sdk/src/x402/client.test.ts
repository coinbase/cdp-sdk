import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentPayload, PaymentRequired } from "@x402/core/types";

// ─── Hoisted mocks (shared between vi.mock factories and test assertions) ─────

const {
  mockCreatePaymentPayload,
  mockRegister,
  mockRegisterV1,
  mockRegisterPolicy,
  mockOnBeforePaymentCreation,
  mockOnAfterPaymentCreation,
  mockOnPaymentCreationFailure,
  mockGetOrCreateAccount,
  mockGetOrCreateSmartAccount,
  mockListSmartAccounts,
  mockGetSmartAccount,
  mockSolanaGetOrCreateAccount,
  MockCdpClient,
} = vi.hoisted(() => {
  const mockCreatePaymentPayload = vi.fn();
  const mockRegister = vi.fn();
  const mockRegisterV1 = vi.fn();
  const mockRegisterPolicy = vi.fn();
  const mockOnBeforePaymentCreation = vi.fn().mockReturnThis();
  const mockOnAfterPaymentCreation = vi.fn().mockReturnThis();
  const mockOnPaymentCreationFailure = vi.fn().mockReturnThis();
  const mockGetOrCreateAccount = vi.fn();
  const mockGetOrCreateSmartAccount = vi.fn();
  const mockListSmartAccounts = vi.fn();
  const mockGetSmartAccount = vi.fn();
  const mockSolanaGetOrCreateAccount = vi.fn();

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
    mockRegisterV1,
    mockRegisterPolicy,
    mockOnBeforePaymentCreation,
    mockOnAfterPaymentCreation,
    mockOnPaymentCreationFailure,
    mockGetOrCreateAccount,
    mockGetOrCreateSmartAccount,
    mockListSmartAccounts,
    mockGetSmartAccount,
    mockSolanaGetOrCreateAccount,
    MockCdpClient,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@x402/core/client", () => {
  class MockX402Client {
    register(...args: unknown[]) {
      return mockRegister(...args);
    }

    registerV1(...args: unknown[]) {
      return mockRegisterV1(...args);
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

// `client.ts` registers schemes by constructing these classes directly (not
// via the `registerExact*Scheme` helper functions), so each is mocked as a
// plain constructor whose call args (signer, RPC map) tests can assert on.
vi.mock("@x402/evm/exact/client", () => ({
  ExactEvmScheme: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@x402/evm/exact/v1/client", () => ({
  ExactEvmSchemeV1: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@x402/evm/upto/client", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@x402/evm/batch-settlement/client", () => ({
  BatchSettlementEvmScheme: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@x402/svm/exact/client", () => ({
  ExactSvmScheme: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@x402/svm/exact/v1/client", () => ({
  ExactSvmSchemeV1: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../client/cdp.js", () => ({ CdpClient: MockCdpClient }));

vi.mock("./account-signers.js", () => ({
  fromCdpEvmAccount: vi.fn().mockReturnValue({ address: "0xEvm", signTypedData: vi.fn() }),
  fromCdpSmartWallet: vi.fn().mockReturnValue({ address: "0xScw", signTypedData: vi.fn() }),
  cdpSolanaAccountToSvmSigner: vi.fn().mockReturnValue({ address: "SolMock" }),
}));

// Base/Base Sepolia RPC defaults are resolved via the CDP-authenticated node
// endpoint (see getBaseNodeRpcUrl); mock it so tests don't depend on a live
// CDP client configuration. `constants.ts` and `guardrails/normalize.ts` are
// left unmocked — they're pure lookups over static data and safe to run for real.
vi.mock("../accounts/evm/getBaseNodeRpcUrl.js", () => ({
  getBaseNodeRpcUrl: vi.fn((network: "base" | "base-sepolia") =>
    Promise.resolve(
      network === "base"
        ? "https://api.developer.coinbase.com/rpc/v1/base/mock-token"
        : "https://api.developer.coinbase.com/rpc/v1/base-sepolia/mock-token",
    ),
  ),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { CdpX402Client } from "./client.js";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactEvmSchemeV1 } from "@x402/evm/exact/v1/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { ExactSvmSchemeV1 } from "@x402/svm/exact/v1/client";

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

/**
 * Returns the RPC-by-chain-ID map most recently passed to a mocked scheme
 * constructor (`ExactEvmScheme` / `UptoEvmScheme`), as `client.ts` builds one
 * shared map per network and passes it straight through.
 *
 * @param mockCtor - The mocked scheme constructor to read the last call from.
 * @returns The RPC-by-chain-ID map, or `undefined` if never called.
 */
function lastEvmRpcMap(
  mockCtor: typeof ExactEvmScheme | typeof UptoEvmScheme,
): Record<number, { rpcUrl: string }> | undefined {
  return vi.mocked(mockCtor).mock.calls.at(-1)?.[1] as
    | Record<number, { rpcUrl: string }>
    | undefined;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CdpX402Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv(ENV_VARS);
    mockGetOrCreateAccount.mockResolvedValue(mockEvmAccount);
    mockSolanaGetOrCreateAccount.mockResolvedValue(mockSvmAccount);
    mockCreatePaymentPayload.mockResolvedValue(mockPayload);
  });

  afterEach(() => {
    clearEnv([
      "CDP_API_KEY_ID",
      "CDP_API_KEY_SECRET",
      "CDP_WALLET_SECRET",
      "CDP_X402_CLIENT_ENVIRONMENT",
    ]);
  });

  describe("constructor", () => {
    it("accepts no arguments — reads credentials from env vars", () => {
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
    it("registers exact + upto for Base mainnet by default (production, EOA wallet)", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockRegister).toHaveBeenCalledWith("eip155:8453", expect.anything());
      expect(mockRegister).not.toHaveBeenCalledWith("eip155:84532", expect.anything());
      expect(mockRegisterV1).toHaveBeenCalledWith("base", expect.anything());
      expect(mockRegisterV1).not.toHaveBeenCalledWith("base-sepolia", expect.anything());
      expect(ExactEvmScheme).toHaveBeenCalledTimes(1);
      expect(UptoEvmScheme).toHaveBeenCalledTimes(1);
    });

    it("does not register Solana by default — it has no default RPC", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(ExactSvmScheme).not.toHaveBeenCalled();
      expect(ExactSvmSchemeV1).not.toHaveBeenCalled();
    });

    it("registers an exact Solana scheme when added via networkSchemes with an rpcUrl", async () => {
      const client = new CdpX402Client({
        networkSchemes: [
          {
            network: "solana",
            rpcUrl: "https://my-solana-rpc.example.com",
            scheme: { exact: true, upto: undefined, "batch-settlement": undefined },
          },
        ],
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(ExactSvmScheme).toHaveBeenCalledWith(expect.anything(), {
        rpcUrl: "https://my-solana-rpc.example.com",
      });
      expect(mockRegister).toHaveBeenCalledWith(
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        expect.anything(),
      );
    });

    it("skips a Solana network added via networkSchemes without an rpcUrl, with a warning", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const client = new CdpX402Client({
        networkSchemes: [
          {
            network: "solana",
            scheme: { exact: true, upto: undefined, "batch-settlement": undefined },
          },
        ],
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(ExactSvmScheme).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('skipping network "solana"'));
      warnSpy.mockRestore();
    });
  });

  describe("environment", () => {
    it("defaults to production — registers Base mainnet, not Base Sepolia", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockRegister).toHaveBeenCalledWith("eip155:8453", expect.anything());
      expect(mockRegister).not.toHaveBeenCalledWith("eip155:84532", expect.anything());
    });

    it("registers Base Sepolia instead of mainnet when environment: 'development' is set explicitly", async () => {
      const client = new CdpX402Client({ environment: "development" });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockRegister).toHaveBeenCalledWith("eip155:84532", expect.anything());
      expect(mockRegister).not.toHaveBeenCalledWith("eip155:8453", expect.anything());
    });

    it("falls back to CDP_X402_CLIENT_ENVIRONMENT when config.environment is not set", async () => {
      process.env.CDP_X402_CLIENT_ENVIRONMENT = "development";
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockRegister).toHaveBeenCalledWith("eip155:84532", expect.anything());
      expect(mockRegister).not.toHaveBeenCalledWith("eip155:8453", expect.anything());
    });

    it("prefers explicit config.environment over CDP_X402_CLIENT_ENVIRONMENT", async () => {
      process.env.CDP_X402_CLIENT_ENVIRONMENT = "development";
      const client = new CdpX402Client({ environment: "production" });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockRegister).toHaveBeenCalledWith("eip155:8453", expect.anything());
      expect(mockRegister).not.toHaveBeenCalledWith("eip155:84532", expect.anything());
    });

    it("an unrecognized CDP_X402_CLIENT_ENVIRONMENT value falls back to production", async () => {
      process.env.CDP_X402_CLIENT_ENVIRONMENT = "staging";
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(mockRegister).toHaveBeenCalledWith("eip155:8453", expect.anything());
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

    it("throws if smart wallet type is set but ownerAccountName is missing", async () => {
      const client = new CdpX402Client({
        walletConfig: { type: "smart", ownerAccountName: "" },
      });
      await expect(client.createPaymentPayload(mockPaymentRequired)).rejects.toThrow(
        /Missing required owner account name/,
      );
    });

    it("still registers the exact EVM scheme for smart wallets", async () => {
      const client = new CdpX402Client({
        walletConfig: { type: "smart", ownerAccountName: "my-owner" },
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(ExactEvmScheme).toHaveBeenCalled();
    });

    it("does not register the upto EVM scheme for smart wallets", async () => {
      const client = new CdpX402Client({
        walletConfig: { type: "smart", ownerAccountName: "my-owner" },
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(UptoEvmScheme).not.toHaveBeenCalled();
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

  describe("accountName", () => {
    it("resolves the default account name without provisioning a wallet", () => {
      const client = new CdpX402Client();
      expect(client.accountName).toBe("x402-client-wallet-1");
      expect(MockCdpClient).not.toHaveBeenCalled();
    });

    it("resolves a custom account name from config", () => {
      const client = new CdpX402Client({
        walletConfig: { type: "eoa", accountName: "my-agent-wallet" },
      });
      expect(client.accountName).toBe("my-agent-wallet");
    });
  });

  describe("getAddresses", () => {
    it("provisions the wallet and returns its EVM and Solana addresses", async () => {
      const client = new CdpX402Client();
      const addresses = await client.getAddresses();

      expect(addresses.evmAddress).toBe(MOCK_EVM_ADDRESS);
      expect(addresses.svmAddress).toBe(MOCK_SVM_ADDRESS);
      expect(addresses.ownerWallet).toBeUndefined();
      expect(MockCdpClient).toHaveBeenCalledTimes(1);
    });

    it("shares initialization with createPaymentPayload", async () => {
      const client = new CdpX402Client();
      await client.getAddresses();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(MockCdpClient).toHaveBeenCalledTimes(1);
    });

    it("includes the owner wallet name for smart wallets", async () => {
      mockGetOrCreateAccount
        .mockResolvedValueOnce({ address: "0xowner", signTypedData: vi.fn() })
        .mockResolvedValue(mockEvmAccount);
      mockGetOrCreateSmartAccount.mockResolvedValue(mockSmartAccount);

      const client = new CdpX402Client({
        walletConfig: { type: "smart", ownerAccountName: "my-owner" },
      });
      const addresses = await client.getAddresses();

      expect(addresses.evmAddress).toBe(MOCK_SCW_ADDRESS);
      expect(addresses.ownerWallet).toBe("my-owner");
    });
  });

  describe("RPC URL override behavior", () => {
    it("defaults Base mainnet's RPC to the CDP-authenticated node endpoint", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      const evmRpcMap = lastEvmRpcMap(ExactEvmScheme);
      expect(evmRpcMap?.[8453]?.rpcUrl).toBe(
        "https://api.developer.coinbase.com/rpc/v1/base/mock-token",
      );
      // Polygon isn't prescribed by default and has no bundled RPC.
      expect(evmRpcMap?.[137]).toBeUndefined();
    });

    it("defaults Base Sepolia's RPC to the CDP-authenticated node endpoint in development", async () => {
      const client = new CdpX402Client({ environment: "development" });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(lastEvmRpcMap(ExactEvmScheme)?.[84532]?.rpcUrl).toBe(
        "https://api.developer.coinbase.com/rpc/v1/base-sepolia/mock-token",
      );
    });

    it("passes an explicit networkSchemes rpcUrl override to exact and upto schemes", async () => {
      const client = new CdpX402Client({
        networkSchemes: [
          {
            network: "base",
            rpcUrl: "https://my-rpc.example.com",
            scheme: { exact: true, upto: true, "batch-settlement": undefined },
          },
        ],
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(lastEvmRpcMap(ExactEvmScheme)?.[8453]?.rpcUrl).toBe("https://my-rpc.example.com");
      expect(lastEvmRpcMap(UptoEvmScheme)?.[8453]?.rpcUrl).toBe("https://my-rpc.example.com");
    });

    it("registers an explicit Solana scheme when an SVM RPC override is provided via networkSchemes", async () => {
      const client = new CdpX402Client({
        networkSchemes: [
          {
            network: "solana-devnet",
            rpcUrl: "https://solana-devnet-rpc.example.com",
            scheme: { exact: true, upto: undefined, "batch-settlement": undefined },
          },
        ],
      });
      await client.createPaymentPayload(mockPaymentRequired);

      expect(ExactSvmScheme).toHaveBeenCalledWith(expect.anything(), {
        rpcUrl: "https://solana-devnet-rpc.example.com",
      });
      expect(mockRegister).toHaveBeenCalledWith(
        "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        expect.anything(),
      );
    });
  });
});
