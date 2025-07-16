import { describe, it, expect, vi, beforeEach } from "vitest";

import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { Address } from "../../../types/misc.js";
import { parseUnits } from "viem";
import { quoteFund, SolanaQuoteFundOptions } from "./quoteFund.js";

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get quote to fund SOL", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockSolTransfer }),
    } as unknown as CdpOpenApiClientType;

    const quoteFundArgs: SolanaQuoteFundOptions = {
      address: address,
      amount: parseUnits("1", 9),
      token: "sol",
      network: "solana",
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
        network: "solana",
        address: address,
        currency: "sol",
      },
      amount: "1",
      currency: "sol",
    });

    expect(result.quoteId).toEqual("0xmocktransferid");
    expect(result.network).toEqual("solana");
    expect(result.fiatAmount).toEqual("1000");
    expect(result.fiatCurrency).toEqual("usd");
    expect(result.token).toEqual("sol");
    expect(result.tokenAmount).toEqual("1");
    expect(result.fees[0].type).toEqual("exchange_fee");
    expect(result.fees[0].amount).toEqual("1");
    expect(result.fees[0].currency).toEqual("usd");
  });

  it("should get quote to fund USDC", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockUsdcTransfer }),
    } as unknown as CdpOpenApiClientType;

    const quoteFundArgs: SolanaQuoteFundOptions = {
      address: address,
      amount: parseUnits("1", 6),
      token: "usdc",
      network: "solana",
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
        network: "solana",
        address: address,
        currency: "usdc",
      },
      amount: "1",
      currency: "usdc",
    });

    expect(result.quoteId).toEqual("0xmocktransferid");
    expect(result.network).toEqual("solana");
    expect(result.fiatAmount).toEqual("1");
    expect(result.fiatCurrency).toEqual("usd");
    expect(result.token).toEqual("usdc");
    expect(result.tokenAmount).toEqual("1");
    expect(result.fees[0].type).toEqual("exchange_fee");
    expect(result.fees[0].amount).toEqual("1");
    expect(result.fees[0].currency).toEqual("usd");
  });

  it("should throw error when no payment methods available", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue([]),
      createPaymentTransferQuote: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    const quoteFundArgs: SolanaQuoteFundOptions = {
      address: address,
      amount: parseUnits("1", 9),
      token: "sol",
      network: "solana",
    };

    await expect(quoteFund(mockApiClient, quoteFundArgs)).rejects.toThrow(
      "No card found to fund account",
    );

    expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();
    expect(mockApiClient.createPaymentTransferQuote).not.toHaveBeenCalled();
  });
});
