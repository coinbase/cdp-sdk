import { describe, expect, it, vi, beforeEach, MockedFunction } from "vitest";
import { toNetworkScopedEvmServerAccount } from "./toNetworkScopedEvmServerAccount.js";
import type { EvmServerAccount } from "./types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type {
  Account,
  Chain,
  PublicClient,
  TransactionSerializable,
  Transport,
  WalletClient,
} from "viem";
import { Quote } from "../../actions/evm/fund/Quote.js";
import { base, baseSepolia, polygon } from "viem/chains";
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
  const mockApiClient = {} as CdpOpenApiClientType;
  const mockAddress = "0x1234567890123456789012345678901234567890";
  const mockNetwork = "ethereum";
  const mockName = "test-account";
  const mockPolicies = ["policy1", "policy2"];

  const mockPublicClient = {
    waitForTransactionReceipt: vi.fn(),
  };
  const mockWalletClient = {
    sendTransaction: vi.fn(),
  };

  const createMockEvmServerAccount = (): EvmServerAccount => ({
    address: mockAddress,
    name: mockName,
    type: "evm-server",
    policies: mockPolicies,
    signMessage: vi.fn().mockResolvedValue("0xsignature"),
    sign: vi.fn().mockResolvedValue("0xsignature"),
    signTransaction: vi.fn().mockResolvedValue("0xsignedTx"),
    signTypedData: vi.fn().mockResolvedValue("0xsignature"),
    listTokenBalances: vi.fn().mockResolvedValue({
      balances: [],
      nextPageToken: undefined,
    }),
    requestFaucet: vi.fn().mockResolvedValue({
      transactionHash: "0xtxhash",
    }),
    quoteFund: vi
      .fn()
      .mockResolvedValue(
        new Quote(mockApiClient, "quote-123", "base", "100", "USD", "100", "eth", []),
      ),
    fund: vi.fn().mockResolvedValue({
      id: "op-123",
      network: "base",
      targetAmount: "100",
      targetCurrency: "eth",
      status: "completed",
      transactionHash: "0xtxhash",
    }),
    waitForFundOperationReceipt: vi.fn().mockResolvedValue({
      id: "op-123",
      network: "base",
      targetAmount: "100",
      targetCurrency: "eth",
      status: "completed",
      transactionHash: "0xtxhash",
    }),
    quoteSwap: vi.fn().mockResolvedValue({
      liquidityAvailable: true,
      network: "base",
      toToken: mockAddress,
      fromToken: mockAddress,
      fromAmount: 100n,
      toAmount: 100n,
      minToAmount: 100n,
      blockNumber: 100n,
      fees: {
        gasFee: {
          amount: 100n,
          token: mockAddress,
        },
      },
      issues: {
        simulationIncomplete: false,
      },
      execute: vi.fn().mockResolvedValue({
        transactionHash: "0xtxhash",
      }),
    }),
    swap: vi.fn().mockResolvedValue({
      transactionHash: "0xtxhash",
    }),
    transfer: vi.fn().mockResolvedValue({
      transactionHash: "0xtxhash",
    }),
    sendTransaction: vi.fn().mockResolvedValue({
      transactionHash: "0xtxhash",
    }),
    useNetwork: vi.fn().mockResolvedValue({}),
  });

  beforeEach(async () => {
    vi.resetAllMocks();

    mockResolveViemClients.mockResolvedValue({
      publicClient: mockPublicClient as unknown as PublicClient<Transport, Chain>,
      walletClient: mockWalletClient as unknown as WalletClient<Transport, Chain, Account>,
      chain: baseSepolia,
    });
  });

  it("should create a network-scoped account with all properties", async () => {
    const mockAccount = createMockEvmServerAccount();
    const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
      account: mockAccount,
      network: mockNetwork,
    });

    expect(result).toEqual({
      address: mockAddress,
      network: mockNetwork,
      name: mockName,
      type: "evm-server",
      policies: mockPolicies,
      signMessage: mockAccount.signMessage,
      sign: mockAccount.sign,
      signTransaction: mockAccount.signTransaction,
      signTypedData: mockAccount.signTypedData,
      requestFaucet: expect.any(Function),
      transfer: expect.any(Function),
      sendTransaction: expect.any(Function),
      waitForTransactionReceipt: expect.any(Function),
    });
  });

  it("should preserve all signing functions from the original account", async () => {
    const mockAccount = createMockEvmServerAccount();
    const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
      account: mockAccount,
      network: mockNetwork,
    });

    // Test that all signing functions are preserved and work as expected
    const message = { message: "test" };
    const hash = "0xhash";
    const transaction: TransactionSerializable = {
      to: mockAddress,
      value: 100n,
      chainId: 1,
    };
    const typedData = {
      domain: { name: "Test" },
      types: { Test: [{ name: "test", type: "string" }] },
      primaryType: "Test",
      message: { test: "test" },
    } as const;

    expect(await result.signMessage(message)).toBe("0xsignature");
    expect(await result.sign({ hash })).toBe("0xsignature");
    expect(await result.signTransaction(transaction)).toBe("0xsignedTx");
    expect(await result.signTypedData(typedData)).toBe("0xsignature");
  });

  describe("requestFaucet", () => {
    it("should throw an error if the network is not base-sepolia or ethereum-sepolia", async () => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient as unknown as PublicClient<Transport, Chain>,
        walletClient: mockWalletClient as unknown as WalletClient<Transport, Chain, Account>,
        chain: base,
      });

      const mockAccount = createMockEvmServerAccount();
      const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
        account: mockAccount,
        network: "base",
      });

      await expect(result.requestFaucet({ token: "eth" })).rejects.toThrow(
        "Requesting a faucet is supported only on base-sepolia or ethereum-sepolia",
      );
    });

    it("should call the requestFaucet function with the correct network", async () => {
      const mockAccount = createMockEvmServerAccount();
      const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
        account: mockAccount,
        network: "base-sepolia",
      });

      await result.requestFaucet({ token: "eth" });

      expect(mockAccount.requestFaucet).toHaveBeenCalledWith({
        token: "eth",
        network: "base-sepolia",
      });
    });
  });

  describe("sendTransaction", () => {
    it("should call the sendTransaction function with the correct network when using the API", async () => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient as unknown as PublicClient<Transport, Chain>,
        walletClient: mockWalletClient as unknown as WalletClient<Transport, Chain, Account>,
        chain: base,
      });

      const mockAccount = createMockEvmServerAccount();
      const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
        account: mockAccount,
        network: "base",
      });

      await result.sendTransaction({
        transaction: {
          to: mockAddress,
          value: 100n,
        },
      });

      expect(mockAccount.sendTransaction).toHaveBeenCalledWith({
        transaction: {
          to: mockAddress,
          value: 100n,
        },
        network: "base",
      });
      expect(mockWalletClient.sendTransaction).not.toHaveBeenCalled();
    });

    it("should use the wallet client when not using the API", async () => {
      mockResolveViemClients.mockResolvedValue({
        publicClient: mockPublicClient as unknown as PublicClient<Transport, Chain>,
        walletClient: mockWalletClient as unknown as WalletClient<Transport, Chain, Account>,
        chain: polygon,
      });

      const mockAccount = createMockEvmServerAccount();
      const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
        account: mockAccount,
        network: "https://rpc-url-for-other-network.com",
      });

      await result.sendTransaction({
        transaction: {
          to: mockAddress,
          value: 100n,
        },
      });

      expect(mockAccount.sendTransaction).not.toHaveBeenCalled();
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: mockAddress,
        value: 100n,
      });
    });
  });

  describe("waitForTransactionReceipt", () => {
    it("should call the waitForTransactionReceipt function", async () => {
      const mockAccount = createMockEvmServerAccount();
      const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
        account: mockAccount,
        network: "base",
      });

      await result.waitForTransactionReceipt({
        hash: "0xtxhash",
      });

      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: "0xtxhash",
      });
    });

    it("should handle a TransactionResult object", async () => {
      const mockAccount = createMockEvmServerAccount();
      const result = await toNetworkScopedEvmServerAccount(mockApiClient, {
        account: mockAccount,
        network: "base",
      });

      await result.waitForTransactionReceipt({
        transactionHash: "0xtxhash",
      });

      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: "0xtxhash",
      });
    });
  });
});
