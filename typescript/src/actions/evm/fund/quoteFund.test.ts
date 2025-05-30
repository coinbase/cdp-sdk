import { describe, it, expect, vi, beforeEach } from "vitest";

import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { Address } from "../../../types/misc.js";
import { parseEther } from "viem";
import { quoteFund, QuoteFundOptions } from "./quoteFund.js";

describe("quoteFund", () => {
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
  };

  const mockTransfer = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get quote to fund ETH", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockEthTransfer }),
    } as unknown as CdpOpenApiClientType;

    const quoteFundArgs: QuoteFundOptions = {
      address: address,
      amount: parseEther("1"),
      token: "eth",
      network: "base",
    };

    const result = await quoteFund(mockApiClient, quoteFundArgs);

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
        currency: "eth",
      },
      amount: "1",
      currency: "eth",
    });

    expect(result.quoteId).toEqual("0xmocktransferid");
    expect(result.network).toEqual("base");
    expect(result.fiatAmount).toEqual("1000");
    expect(result.fiatCurrency).toEqual("usd");
    expect(result.token).toEqual("eth");
    expect(result.tokenAmount).toEqual("1");
    expect(result.fees[0].type).toEqual("exchange_fee");
    expect(result.fees[0].amount).toEqual("1");
    expect(result.fees[0].currency).toEqual("usd");
  });

  it("should get quote to fund USDC", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockTransfer }),
    } as unknown as CdpOpenApiClientType;

    const quoteFundArgs: QuoteFundOptions = {
      address: address,
      amount: 1000000n, // 1 USDC
      token: "usdc",
      network: "base",
    };

    const result = await quoteFund(mockApiClient, quoteFundArgs);

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
    });

    expect(result.quoteId).toEqual("0xmocktransferid");
    expect(result.network).toEqual("base");
    expect(result.fiatAmount).toEqual("1");
    expect(result.fiatCurrency).toEqual("usd");
    expect(result.token).toEqual("usdc");
    expect(result.tokenAmount).toEqual("1");
    expect(result.fees).toHaveLength(0);
  });

  it("should throw error when no payment methods available", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue([]),
      createPaymentTransferQuote: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    const quoteFundArgs: QuoteFundOptions = {
      address: address,
      amount: 1000000000000000000n, // 1 ETH
      token: "eth",
      network: "base",
    };

    await expect(quoteFund(mockApiClient, quoteFundArgs)).rejects.toThrow(
      "No card found to fund account",
    );

    expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();
    expect(mockApiClient.createPaymentTransferQuote).not.toHaveBeenCalled();
  });
});
