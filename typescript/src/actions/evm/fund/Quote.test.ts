import { describe, it, expect, vi, beforeEach } from "vitest";

import { Quote } from "./Quote.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";

describe("Quote", () => {
  let mockApiClient: CdpOpenApiClientType;
  const mockTransfer = {
    id: "0xmocktransferid",
    sourceType: "payment_method",
    source: {
      id: "0xmockpaymentmethodid",
    },
    targetType: "crypto_rail",
    target: {
      network: "base",
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      symbol: "eth",
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

  beforeEach(() => {
    mockApiClient = {
      executePaymentTransferQuote: vi.fn().mockResolvedValue(mockTransfer),
    } as unknown as CdpOpenApiClientType;
    vi.clearAllMocks();
  });

  it("should create a Quote instance with correct properties", () => {
    const quote = new Quote(mockApiClient, "0xmocktransferid", "base", "1000", "usd", "1", "eth", [
      {
        type: "exchange_fee",
        amount: "1",
        currency: "usd",
      },
    ]);

    expect(quote.quoteId).toBe("0xmocktransferid");
    expect(quote.network).toBe("base");
    expect(quote.fiatAmount).toBe("1000");
    expect(quote.fiatCurrency).toBe("usd");
    expect(quote.tokenAmount).toBe("1");
    expect(quote.token).toBe("eth");
    expect(quote.fees).toEqual([
      {
        type: "exchange_fee",
        amount: "1",
        currency: "usd",
      },
    ]);
  });

  it("should execute the quote successfully", async () => {
    const quote = new Quote(mockApiClient, "0xmocktransferid", "base", "1000", "usd", "1", "eth", [
      {
        type: "exchange_fee",
        amount: "1",
        currency: "usd",
      },
    ]);

    const result = await quote.execute();

    expect(mockApiClient.executePaymentTransferQuote).toHaveBeenCalledWith("0xmocktransferid");
    expect(result).toEqual({
      id: mockTransfer.id,
      network: mockTransfer.target.network,
      targetAmount: mockTransfer.targetAmount,
      targetCurrency: mockTransfer.targetCurrency,
      status: mockTransfer.status,
      transactionHash: mockTransfer.transactionHash,
    });
  });

  it("should handle API errors during execution", async () => {
    const error = new Error("API Error");
    mockApiClient.executePaymentTransferQuote = vi.fn().mockRejectedValue(error);

    const quote = new Quote(mockApiClient, "0xmocktransferid", "base", "1000", "usd", "1", "eth", [
      {
        type: "exchange_fee",
        amount: "1",
        currency: "usd",
      },
    ]);

    await expect(quote.execute()).rejects.toThrow("API Error");
    expect(mockApiClient.executePaymentTransferQuote).toHaveBeenCalledWith("0xmocktransferid");
  });
});
