import { describe, expect, it, vi, beforeEach, MockedFunction } from "vitest";
import { toNetworkScopedEvmServerAccount } from "./toNetworkScopedEvmServerAccount.js";
import type { EvmServerAccount } from "./types.js";
import { base, baseSepolia } from "viem/chains";
import { resolveViemClients } from "./resolveViemClients.js";

vi.mock("./resolveViemClients.js", async () => {
  const actual = await vi.importActual("./resolveViemClients.js");
  return {
    ...actual,
    resolveViemClients: vi.fn(),
  };
});
const mockResolveViemClients = resolveViemClients as MockedFunction<typeof resolveViemClients>;

describe("toNetworkScopedEvmServerAccount", () => {
  let mockAccount: EvmServerAccount;
  let mockPublicClient: any;
  let mockWalletClient: any;

  beforeEach(() => {
    vi.resetAllMocks();

    // Create mock clients
    mockPublicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    };

    mockWalletClient = {
      sendTransaction: vi.fn().mockResolvedValue("0xtransactionhash"),
    };

    // Create mock base account with all methods
    mockAccount = {
      address: "0x1234567890123456789012345678901234567890",
      name: "test-account",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      policies: [],
      // Actions
      listTokenBalances: vi.fn().mockResolvedValue({ balances: [], nextPageToken: undefined }),
      requestFaucet: vi.fn().mockResolvedValue({ transactionHash: "0xhash" }),
      quoteFund: vi.fn().mockResolvedValue({
        quoteId: "quote-123",
        network: "base",
        fiatAmount: "100",
        fiatCurrency: "USD",
        tokenAmount: "0.05",
        token: "ETH",
        fees: [],
        execute: vi.fn(),
      }),
      fund: vi.fn().mockResolvedValue({
        id: "fund-123",
        network: "base",
        status: "completed",
        targetAmount: "0.05",
        targetCurrency: "ETH",
        transactionHash: "0xhash",
      }),
      waitForFundOperationReceipt: vi.fn().mockResolvedValue({
        id: "fund-123",
        network: "base",
        status: "completed",
        targetAmount: "0.05",
        targetCurrency: "ETH",
        transactionHash: "0xhash",
      }),
      transfer: vi.fn().mockResolvedValue({ transactionHash: "0xhash" }),
      quoteSwap: vi.fn().mockResolvedValue({
        liquidityAvailable: true,
        toToken: "0xtoken",
        fromToken: "0xtoken",
        fromAmount: 1000n,
        toAmount: 1000n,
        minToAmount: 990n,
        blockNumber: 123n,
        fees: {},
        issues: { simulationIncomplete: false },
      }),
      swap: vi.fn().mockResolvedValue({
        liquidityAvailable: true,
        network: "base",
        toToken: "0xtoken",
        fromToken: "0xtoken",
        fromAmount: 1000n,
        toAmount: 1000n,
        minToAmount: 990n,
        blockNumber: 123n,
        fees: {},
        issues: { simulationIncomplete: false },
        execute: vi.fn(),
      }),
      // AccountActions
      sign: vi.fn().mockResolvedValue("0xsignature"),
      signHash: vi.fn().mockResolvedValue({ signature: "0xsignature" }),
      signMessage: vi.fn().mockResolvedValue("0xsignature"),
      signTypedData: vi.fn().mockResolvedValue("0xsignature"),
      signTransaction: vi.fn().mockResolvedValue("0xsignature"),
      signX402Payment: vi.fn().mockResolvedValue({
        x402Version: 2,
        resource: { url: "https://example.com" },
        accepted: {},
        payload: {},
      }),
      sendTransaction: vi.fn().mockResolvedValue({ transactionHash: "0xhash" }),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
      export: vi.fn().mockResolvedValue("exported-key"),
      reload: vi.fn().mockResolvedValue(undefined),
    } as unknown as EvmServerAccount;
  });

  describe("base network", () => {
    beforeEach(() => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: base,
      });
    });

    it("should create a network-scoped account with all methods for base network", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "base",
      });

      // Check that all methods are available
      expect(networkAccount.listTokenBalances).toBeDefined();
      expect(networkAccount.transfer).toBeDefined();
      expect(networkAccount.swap).toBeDefined();
      expect(networkAccount.sendTransaction).toBeDefined();
      expect(networkAccount.waitForTransactionReceipt).toBeDefined();
      expect(networkAccount.sign).toBeDefined();
      expect(networkAccount.signMessage).toBeDefined();
      expect(networkAccount.signTypedData).toBeDefined();
      expect(networkAccount.signTransaction).toBeDefined();
      expect(networkAccount.signX402Payment).toBeDefined();

      // requestFaucet should NOT be available for base
      expect("requestFaucet" in networkAccount).toBe(false);
    });

    it("should pass network parameter to methods", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "base",
      });

      await networkAccount.listTokenBalances({});
      expect(mockAccount.listTokenBalances).toHaveBeenCalledWith({ network: "base" });

      await networkAccount.transfer({
        to: "0xaddress",
        amount: 100n,
        token: "eth",
        network: "base",
      });
      expect(mockAccount.transfer).toHaveBeenCalledWith({
        to: "0xaddress",
        amount: 100n,
        token: "eth",
        network: "base",
      });

      await networkAccount.sendTransaction({ transaction: { to: "0xaddress", value: 100n } });
      expect(mockAccount.sendTransaction).toHaveBeenCalledWith({
        transaction: { to: "0xaddress", value: 100n },
        network: "base",
      });

      const paymentRequired = {
        x402Version: 2,
        resource: { url: "https://example.com" },
        accepts: [],
      };
      await networkAccount.signX402Payment(paymentRequired as never, 0);
      expect(mockAccount.signX402Payment).toHaveBeenCalledWith(paymentRequired, 0);
    });

    it("throws when acceptedIndex targets a network that does not match the scoped network", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "base",
      });

      const wrongNetworkPayment = {
        x402Version: 2,
        resource: { url: "https://example.com" },
        accepts: [
          {
            scheme: "exact",
            network: "eip155:137", // polygon, not base (eip155:8453)
            asset: "0xasset",
            amount: "1000",
            payTo: "0xpayto",
            maxTimeoutSeconds: 60,
            extra: {},
          },
        ],
      };

      await expect(networkAccount.signX402Payment(wrongNetworkPayment as never, 0)).rejects.toThrow(
        'targets network "eip155:137" but this account is scoped to "base" (eip155:8453)',
      );
      expect(mockAccount.signX402Payment).not.toHaveBeenCalled();
    });

    it("delegates when acceptedIndex targets the scoped network", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "base",
      });

      const matchingPayment = {
        x402Version: 2,
        resource: { url: "https://example.com" },
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            asset: "0xasset",
            amount: "1000",
            payTo: "0xpayto",
            maxTimeoutSeconds: 60,
            extra: {},
          },
        ],
      };

      await networkAccount.signX402Payment(matchingPayment as never, 0);
      expect(mockAccount.signX402Payment).toHaveBeenCalledWith(matchingPayment, 0);
    });
  });

  describe("base-sepolia network", () => {
    beforeEach(() => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: baseSepolia,
      });
    });

    it("should create a network-scoped account with limited methods for base-sepolia", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "base-sepolia",
      });

      // Available methods
      expect(networkAccount.listTokenBalances).toBeDefined();
      expect(networkAccount.requestFaucet).toBeDefined();
      expect(networkAccount.transfer).toBeDefined();
      expect(networkAccount.sendTransaction).toBeDefined();
      expect(networkAccount.waitForTransactionReceipt).toBeDefined();
      expect(networkAccount.useSpendPermission).toBeDefined();

      // Unavailable methods - check via 'in' operator
      expect("quoteFund" in networkAccount).toBe(false);
      expect("fund" in networkAccount).toBe(false);
      expect("waitForFundOperationReceipt" in networkAccount).toBe(false);
      expect("quoteSwap" in networkAccount).toBe(false);
      expect("swap" in networkAccount).toBe(false);
    });

    it("should handle requestFaucet correctly", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "base-sepolia",
      });

      await networkAccount.requestFaucet({ token: "eth" });
      expect(mockAccount.requestFaucet).toHaveBeenCalledWith({
        token: "eth",
        network: "base-sepolia",
      });
    });
  });

  describe("ethereum network", () => {
    beforeEach(() => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: { id: 1, name: "Ethereum Mainnet" } as any, // mainnet
      });
    });

    it("should create a network-scoped account with swap methods for ethereum", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "ethereum",
      });

      // Available methods
      expect(networkAccount.listTokenBalances).toBeDefined();
      expect(networkAccount.swap).toBeDefined();
      expect(networkAccount.sendTransaction).toBeDefined();
      expect(networkAccount.waitForTransactionReceipt).toBeDefined();
      expect(networkAccount.transfer).toBeDefined();

      // Unavailable methods - check via 'in' operator
      expect("requestFaucet" in networkAccount).toBe(false);
      expect("quoteFund" in networkAccount).toBe(false);
      expect("fund" in networkAccount).toBe(false);
    });
  });

  describe("ethereum-sepolia network", () => {
    beforeEach(() => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: { id: 11155111, name: "Ethereum Sepolia" } as any,
      });
    });

    it("should create a network-scoped account with only faucet for ethereum-sepolia", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "ethereum-sepolia",
      });

      // Available methods
      expect(networkAccount.requestFaucet).toBeDefined();
      expect(networkAccount.sendTransaction).toBeDefined();
      expect(networkAccount.waitForTransactionReceipt).toBeDefined();
      expect(networkAccount.transfer).toBeDefined();

      // Always available account actions
      expect(networkAccount.sign).toBeDefined();
      expect(networkAccount.signMessage).toBeDefined();
      expect(networkAccount.signTypedData).toBeDefined();
      expect(networkAccount.signTransaction).toBeDefined();

      // Unavailable methods
      expect("listTokenBalances" in networkAccount).toBe(false);
      expect("quoteFund" in networkAccount).toBe(false);
      expect("fund" in networkAccount).toBe(false);
      expect("quoteSwap" in networkAccount).toBe(false);
      expect("swap" in networkAccount).toBe(false);
    });
  });

  describe("custom RPC URL", () => {
    beforeEach(() => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: { id: 123456, name: "Custom Network" } as any,
      });
    });

    it("should handle custom RPC URLs", async () => {
      const customRpcUrl = "https://custom-rpc.example.com";
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: customRpcUrl,
      });

      // Should have basic methods that are available on all networks
      expect(networkAccount.sendTransaction).toBeDefined();
      expect(networkAccount.transfer).toBeDefined();
      expect(networkAccount.waitForTransactionReceipt).toBeDefined();
      expect(networkAccount.sign).toBeDefined();
      expect(networkAccount.signMessage).toBeDefined();
      expect(networkAccount.signTypedData).toBeDefined();
      expect(networkAccount.signTransaction).toBeDefined();

      // Network-specific methods should not be available
      expect("listTokenBalances" in networkAccount).toBe(false);
      expect("requestFaucet" in networkAccount).toBe(false);
      expect("quoteFund" in networkAccount).toBe(false);
      expect("fund" in networkAccount).toBe(false);
      expect("quoteSwap" in networkAccount).toBe(false);
      expect("swap" in networkAccount).toBe(false);
    });

    it("should recognize base-sepolia chain via RPC URL and enable appropriate methods", async () => {
      // Mock base-sepolia chain ID (84532)
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: { id: 84532, name: "Base Sepolia" } as any,
      });

      const baseSpoliaRpcUrl = "https://base-sepolia.infura.io/v3/your-api-key";
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: baseSpoliaRpcUrl,
      });

      // Should have methods available on base-sepolia
      expect("listTokenBalances" in networkAccount).toBe(true);
      expect("requestFaucet" in networkAccount).toBe(true);
      expect(networkAccount.sendTransaction).toBeDefined();
      expect(networkAccount.waitForTransactionReceipt).toBeDefined();
      expect(networkAccount.transfer).toBeDefined();

      // Should NOT have mainnet-only methods
      expect("quoteFund" in networkAccount).toBe(false);
      expect("fund" in networkAccount).toBe(false);
      expect("quoteSwap" in networkAccount).toBe(false);
      expect("swap" in networkAccount).toBe(false);
    });
  });

  describe("runtime validation", () => {
    beforeEach(() => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: { id: 11155111, name: "Ethereum Sepolia" } as any,
      });
    });

    it("should throw error when trying to use unsupported method via runtime check", async () => {
      // This would happen if someone bypassed TypeScript
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "ethereum-sepolia",
      });

      // Force access to a method that shouldn't exist
      const accountWithMethod = networkAccount as any;
      expect(accountWithMethod.swap).toBeUndefined();
    });
  });

  describe("account properties", () => {
    beforeEach(() => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        chain: base,
      });
    });

    it("should preserve account properties", async () => {
      const networkAccount = await toNetworkScopedEvmServerAccount({
        account: mockAccount,
        network: "base",
      });

      expect(networkAccount.address).toBe(mockAccount.address);
      expect(networkAccount.name).toBe(mockAccount.name);
      expect(networkAccount.type).toBe("evm-server");
      expect(networkAccount.policies).toBe(mockAccount.policies);
    });
  });
});
