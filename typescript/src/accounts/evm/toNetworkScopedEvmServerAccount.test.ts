import { describe, expect, it } from "vitest";
import { toNetworkScopedEvmServerAccount } from "./toNetworkScopedEvmServerAccount.js";
import type { EvmServerAccount } from "./types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { TransactionSerializable } from "viem";
import type { ListTokenBalancesResult } from "../../actions/evm/listTokenBalances.js";
import type { RequestFaucetResult } from "../../actions/evm/requestFaucet.js";
import { Quote } from "../../actions/evm/fund/Quote.js";
import type { FundOperationResult } from "../../actions/evm/fund/types.js";
import type { WaitForFundOperationResult } from "../../actions/evm/fund/waitForFundOperationReceipt.js";
import type { AccountQuoteSwapResult } from "../../actions/evm/swap/types.js";

describe("toNetworkScopedEvmServerAccount", () => {
  const mockApiClient = {} as CdpOpenApiClientType;
  const mockAddress = "0x1234567890123456789012345678901234567890";
  const mockNetwork = "ethereum";
  const mockName = "test-account";
  const mockPolicies = ["policy1", "policy2"];

  const createMockEvmServerAccount = (): EvmServerAccount => ({
    address: mockAddress,
    name: mockName,
    type: "evm-server",
    policies: mockPolicies,
    signMessage: async () => "0xsignature",
    sign: async () => "0xsignature",
    signTransaction: async () => "0xsignedTx",
    signTypedData: async () => "0xsignature",
    listTokenBalances: async (): Promise<ListTokenBalancesResult> => ({
      balances: [],
      nextPageToken: undefined,
    }),
    requestFaucet: async (): Promise<RequestFaucetResult> => ({
      transactionHash: "0xtxhash",
    }),
    quoteFund: async (): Promise<Quote> => {
      const quote = new Quote(mockApiClient, "quote-123", "base", "100", "USD", "100", "eth", []);
      return quote;
    },
    fund: async (): Promise<FundOperationResult> => ({
      id: "op-123",
      network: "base",
      targetAmount: "100",
      targetCurrency: "eth",
      status: "completed",
      transactionHash: "0xtxhash",
    }),
    waitForFundOperationReceipt: async (): Promise<WaitForFundOperationResult> => ({
      id: "op-123",
      network: "base",
      targetAmount: "100",
      targetCurrency: "eth",
      status: "completed",
      transactionHash: "0xtxhash",
    }),
    quoteSwap: async (): Promise<AccountQuoteSwapResult> => ({
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
      execute: async () => ({
        transactionHash: "0xtxhash",
      }),
    }),
    swap: async () => ({
      transactionHash: "0xtxhash",
    }),
    transfer: async () => ({
      transactionHash: "0xtxhash",
    }),
    sendTransaction: async () => ({
      transactionHash: "0xtxhash",
    }),
  });

  it("should create a network-scoped account with all properties", () => {
    const mockAccount = createMockEvmServerAccount();
    const result = toNetworkScopedEvmServerAccount(mockApiClient, {
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
    });
  });

  it("should preserve all signing functions from the original account", async () => {
    const mockAccount = createMockEvmServerAccount();
    const result = toNetworkScopedEvmServerAccount(mockApiClient, {
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
    };

    expect(await result.signMessage(message)).toBe("0xsignature");
    expect(await result.sign({ hash })).toBe("0xsignature");
    expect(await result.signTransaction(transaction)).toBe("0xsignedTx");
    expect(await result.signTypedData(typedData)).toBe("0xsignature");
  });

  it("should handle accounts without optional properties", () => {
    const mockAccount: EvmServerAccount = {
      address: mockAddress,
      type: "evm-server",
      signMessage: async () => "0xsignature",
      sign: async () => "0xsignature",
      signTransaction: async () => "0xsignedTx",
      signTypedData: async () => "0xsignature",
      listTokenBalances: async (): Promise<ListTokenBalancesResult> => ({
        balances: [],
        nextPageToken: undefined,
      }),
      requestFaucet: async (): Promise<RequestFaucetResult> => ({
        transactionHash: "0xtxhash",
      }),
      quoteFund: async (): Promise<Quote> => {
        const quote = new Quote(mockApiClient, "quote-123", "base", "100", "USD", "100", "eth", []);
        return quote;
      },
      fund: async (): Promise<FundOperationResult> => ({
        id: "op-123",
        network: "base",
        targetAmount: "100",
        targetCurrency: "eth",
        status: "completed",
        transactionHash: "0xtxhash",
      }),
      waitForFundOperationReceipt: async (): Promise<WaitForFundOperationResult> => ({
        id: "op-123",
        network: "base",
        targetAmount: "100",
        targetCurrency: "eth",
        status: "completed",
        transactionHash: "0xtxhash",
      }),
      quoteSwap: async (): Promise<AccountQuoteSwapResult> => ({
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
        execute: async () => ({
          transactionHash: "0xtxhash",
        }),
      }),
      swap: async () => ({
        transactionHash: "0xtxhash",
      }),
      transfer: async () => ({
        transactionHash: "0xtxhash",
      }),
      sendTransaction: async () => ({
        transactionHash: "0xtxhash",
      }),
    };

    const result = toNetworkScopedEvmServerAccount(mockApiClient, {
      account: mockAccount,
      network: mockNetwork,
    });

    expect(result).toEqual({
      address: mockAddress,
      network: mockNetwork,
      type: "evm-server",
      signMessage: mockAccount.signMessage,
      sign: mockAccount.sign,
      signTransaction: mockAccount.signTransaction,
      signTypedData: mockAccount.signTypedData,
    });
  });
});
