import { describe, it, expect, vi, beforeEach } from "vitest";

import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { Address } from "../../../types/misc.js";
import { parseEther } from "viem";
import { fund, FundOptions } from "./fund.js";

describe("fund", () => {
  const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address;
  const mockPaymentMethods = [
    {
      id: "0xmockpaymentmethodid",
      type: "card",
      actions: ["source"],
      currency: "usd",
    },
  ];

  const mockEthTransfer = {
    id: "0xmocktransferid",
    sourceType: "payment_method",
    source: {
      id: "0xmockpaymentmethodid",
    },
    targetType: "crypto_rail",
    target: {
      network: "ethereum",
      address: address,
      currency: "eth",
    },
    sourceAmount: "1000",
    sourceCurrency: "usd",
    targetAmount: "1",
    targetCurrency: "eth",
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
      network: "base",
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

  it("should fund ETH", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockEthTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: FundOptions = {
      address: address,
      amount: parseEther("1"),
      token: "eth",
      network: "ethereum",
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
        network: "ethereum",
        address: address,
        currency: "eth",
      },
      amount: "1",
      currency: "eth",
      execute: true,
    });

    expect(result.id).toEqual(mockEthTransfer.id);
    expect(result.network).toEqual(mockEthTransfer.target.network);
    expect(result.status).toEqual(mockEthTransfer.status);
    expect(result.targetAmount).toEqual(mockEthTransfer.targetAmount);
    expect(result.targetCurrency).toEqual(mockEthTransfer.targetCurrency);
    expect(result.transactionHash).toEqual(mockEthTransfer.transactionHash);
  });

  it("should fund USDC", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockUsdcTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: FundOptions = {
      address: address,
      amount: 1000000n, // 1 USDC
      token: "usdc",
      network: "base",
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
        network: "base",
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

    const fundArgs: FundOptions = {
      address: address,
      amount: parseEther("1"),
      token: "eth",
      network: "ethereum",
    };

    await expect(fund(mockApiClient, fundArgs)).rejects.toThrow("No card found to fund account");

    expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();
    expect(mockApiClient.createPaymentTransferQuote).not.toHaveBeenCalled();
  });
});
