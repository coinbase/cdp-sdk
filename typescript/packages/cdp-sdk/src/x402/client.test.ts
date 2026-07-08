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
vi.mock("@x402/svm/exact/client", () => ({
  ExactSvmScheme: vi.fn().mockImplementation(() => ({})),
  registerExactSvmScheme: vi.fn(),
}));

vi.mock("../client/cdp.js", () => ({ CdpClient: MockCdpClient }));

vi.mock("./account-signers.js", () => ({
  fromCdpEvmAccount: vi.fn().mockReturnValue({ address: "0xEvm", signTypedData: vi.fn() }),
  fromCdpSmartWallet: vi.fn().mockReturnValue({ address: "0xScw", signTypedData: vi.fn() }),
  cdpSolanaAccountToSvmSigner: vi.fn().mockReturnValue({ address: "SolMock" }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { CdpX402Client } from "./client.js";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { ExactSvmScheme, registerExactSvmScheme } from "@x402/svm/exact/client";

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
  });

  afterEach(() => {
    clearEnv(["CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET", "CDP_X402_RPC_URLS"]);
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
    it("registers exact EVM, Solana, and upto EVM schemes for EOA wallet", async () => {
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      expect(registerExactEvmScheme).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          signer: expect.anything(),
          schemeOptions: expect.any(Object),
        }),
      );
      expect(registerExactSvmScheme).toHaveBeenCalledTimes(1);
      expect(UptoEvmScheme).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith("eip155:*", expect.any(Object));
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

    it("does not register upto EVM scheme for smart wallets", async () => {
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

  describe("RPC URL override behavior", () => {
    it("passes EVM RPC URL overrides from config to exact and upto schemes", async () => {
      const rpcUrls = { "eip155:8453": { rpcUrl: "https://my-rpc.example.com" } };
      const client = new CdpX402Client({ rpcUrls });
      await client.createPaymentPayload(mockPaymentRequired);

      const exactConfig = vi.mocked(registerExactEvmScheme).mock.calls.at(-1)?.[1] as
        | { schemeOptions?: Record<number, { rpcUrl: string }> }
        | undefined;
      expect(exactConfig?.schemeOptions?.[8453]?.rpcUrl).toBe("https://my-rpc.example.com");

      const uptoConfig = vi.mocked(UptoEvmScheme).mock.calls.at(-1)?.[1] as
        | Record<number, { rpcUrl: string }>
        | undefined;
      expect(uptoConfig?.[8453]?.rpcUrl).toBe("https://my-rpc.example.com");
    });

    it("parses CDP_X402_RPC_URLS env var", async () => {
      process.env.CDP_X402_RPC_URLS = '{"eip155:8453":"https://custom-rpc.example.com"}';
      const client = new CdpX402Client();
      await client.createPaymentPayload(mockPaymentRequired);

      const exactConfig = vi.mocked(registerExactEvmScheme).mock.calls.at(-1)?.[1] as
        | { schemeOptions?: Record<number, { rpcUrl: string }> }
        | undefined;
      expect(exactConfig?.schemeOptions?.[8453]?.rpcUrl).toBe("https://custom-rpc.example.com");
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

      const exactConfig = vi.mocked(registerExactEvmScheme).mock.calls.at(-1)?.[1] as
        | { schemeOptions?: Record<number, { rpcUrl: string }> }
        | undefined;
      expect(exactConfig?.schemeOptions?.[8453]?.rpcUrl).toBe("https://config-rpc.example.com");
    });

    it("registers an explicit Solana scheme when an SVM RPC override is provided", async () => {
      const rpcUrls = {
        "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": {
          rpcUrl: "https://solana-devnet-rpc.example.com",
        },
      };
      const client = new CdpX402Client({ rpcUrls });
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
