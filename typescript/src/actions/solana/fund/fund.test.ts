import { describe, it, expect, vi, beforeEach } from "vitest";

import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { Address } from "../../../types/misc.js";
import { parseUnits } from "viem";
import { fund, SolanaFundOptions } from "./fund.js";

/**
 * Tests for the deprecated Solana fund() method.
 *
 * @deprecated The fund() method is deprecated and will be removed in a future version.
 * These tests are maintained to ensure backwards compatibility until removal.
 * Consider using alternative funding methods for new implementations.
 */

describe("fund (DEPRECATED)", () => {
  const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address;
  const mockPaymentMethods = [
    {
      id: "0xmockpaymentmethodid",
      type: "card",
      actions: ["source"],
      currency: "usd",
    },
  ];

  const mockSolTransfer = {
    id: "0xmocktransferid",
    sourceType: "payment_method",
    source: {
      id: "0xmockpaymentmethodid",
    },
    targetType: "crypto_rail",
    target: {
      network: "solana",
      address: address,
      currency: "sol",
    },
    sourceAmount: "1000",
    sourceCurrency: "usd",
    targetAmount: "1",
    targetCurrency: "sol",
    userAmount: "1000",
    userCurrency: "usd",
    fees: [
      {
        type: "exchange_fee",
        amount: "1",
        currency: "usd",
      },
    ],
    status: "pending",
    createdAt: "2021-01-01T00:00:00.000Z",
    updatedAt: "2021-01-01T00:00:00.000Z",
    transactionHash: "0xmocktransactionhash",
  };

  const mockUsdcTransfer = {
    id: "0xmocktransferid",
    sourceType: "payment_method",
    source: {
      id: "0xmockpaymentmethodid",
    },
    targetType: "crypto_rail",
    target: {
      network: "solana",
      address: address,
      currency: "usdc",
    },
    sourceAmount: "1",
    sourceCurrency: "usd",
    targetAmount: "1",
    targetCurrency: "usdc",
    userAmount: "1",
    userCurrency: "usd",
    fees: [],
    status: "pending",
    createdAt: "2021-01-01T00:00:00.000Z",
    updatedAt: "2021-01-01T00:00:00.000Z",
    transactionHash: "0xmocktransactionhash",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fund SOL", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockSolTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: SolanaFundOptions = {
      address: address,
      amount: parseUnits("1", 9),
      token: "sol",
    };

    const result = await fund(mockApiClient, fundArgs);

    expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();

    expect(mockApiClient.createPaymentTransferQuote).toHaveBeenCalledWith({
      sourceType: "payment_method",
      source: {
        id: "0xmockpaymentmethodid",
      },
      targetType: "crypto_rail",
      target: {
        network: "solana",
        address: address,
        currency: "sol",
      },
      amount: "1",
      currency: "sol",
      execute: true,
    });

    expect(result.id).toEqual(mockSolTransfer.id);
    expect(result.network).toEqual(mockSolTransfer.target.network);
    expect(result.status).toEqual(mockSolTransfer.status);
    expect(result.targetAmount).toEqual(mockSolTransfer.targetAmount);
    expect(result.targetCurrency).toEqual(mockSolTransfer.targetCurrency);
    expect(result.transactionHash).toEqual(mockSolTransfer.transactionHash);
  });

  it("should fund USDC", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockUsdcTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: SolanaFundOptions = {
      address: address,
      amount: parseUnits("1", 6),
      token: "usdc",
    };

    const result = await fund(mockApiClient, fundArgs);

    expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();

    expect(mockApiClient.createPaymentTransferQuote).toHaveBeenCalledWith({
      sourceType: "payment_method",
      source: {
        id: "0xmockpaymentmethodid",
      },
      targetType: "crypto_rail",
      target: {
        network: "solana",
        address: address,
        currency: "usdc",
      },
      amount: "1",
      currency: "usdc",
      execute: true,
    });

    expect(result.id).toEqual(mockUsdcTransfer.id);
    expect(result.network).toEqual(mockUsdcTransfer.target.network);
    expect(result.status).toEqual(mockUsdcTransfer.status);
    expect(result.targetAmount).toEqual(mockUsdcTransfer.targetAmount);
    expect(result.targetCurrency).toEqual(mockUsdcTransfer.targetCurrency);
    expect(result.transactionHash).toEqual(mockUsdcTransfer.transactionHash);
  });

  it("should throw error when no payment methods available", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue([]),
      createPaymentTransferQuote: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: SolanaFundOptions = {
      address: address,
      amount: parseUnits("1", 9),
      token: "sol",
    };

    await expect(fund(mockApiClient, fundArgs)).rejects.toThrow("No card found to fund account");

    expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();
    expect(mockApiClient.createPaymentTransferQuote).not.toHaveBeenCalled();
  });
});
