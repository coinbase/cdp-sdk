import { describe, expect, it, vi } from "vitest";
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
});
