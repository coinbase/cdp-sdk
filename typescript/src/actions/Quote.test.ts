import { describe, it, expect, vi, beforeEach } from "vitest";

import { EvmQuote, SolanaQuote } from "./Quote.js";
import { CdpOpenApiClientType } from "../openapi-client/index.js";

describe("Quote", () => {
  let mockApiClient: CdpOpenApiClientType;

  describe("EvmQuote", () => {
    const mockEvmTransfer = {
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
        executePaymentTransferQuote: vi.fn().mockResolvedValue(mockEvmTransfer),
      } as unknown as CdpOpenApiClientType;
      vi.clearAllMocks();
    });

    it("should create a Quote instance with correct properties", () => {
      const quote = new EvmQuote(
        mockApiClient,
        "0xmocktransferid",
        "base",
        "1000",
        "usd",
        "1",
        "eth",
        [
          {
            type: "exchange_fee",
            amount: "1",
            currency: "usd",
          },
        ],
      );

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
      const quote = new EvmQuote(
        mockApiClient,
        "0xmocktransferid",
        "base",
        "1000",
        "usd",
        "1",
        "eth",
        [
          {
            type: "exchange_fee",
            amount: "1",
            currency: "usd",
          },
        ],
      );

      const result = await quote.execute();

      expect(mockApiClient.executePaymentTransferQuote).toHaveBeenCalledWith("0xmocktransferid");
      expect(result).toEqual({
        id: mockEvmTransfer.id,
        network: mockEvmTransfer.target.network,
        targetAmount: mockEvmTransfer.targetAmount,
        targetCurrency: mockEvmTransfer.targetCurrency,
        status: mockEvmTransfer.status,
        transactionHash: mockEvmTransfer.transactionHash,
      });
    });

    it("should handle API errors during execution", async () => {
      const error = new Error("API Error");
      mockApiClient.executePaymentTransferQuote = vi.fn().mockRejectedValue(error);

      const quote = new EvmQuote(
        mockApiClient,
        "0xmocktransferid",
        "base",
        "1000",
        "usd",
        "1",
        "eth",
        [
          {
            type: "exchange_fee",
            amount: "1",
            currency: "usd",
          },
        ],
      );

      await expect(quote.execute()).rejects.toThrow("API Error");
      expect(mockApiClient.executePaymentTransferQuote).toHaveBeenCalledWith("0xmocktransferid");
    });
  });

  describe("SolanaQuote", () => {
    const mockSolanaTransfer = {
      id: "0xmocktransferid",
      sourceType: "payment_method",
      source: {
        id: "0xmockpaymentmethodid",
      },
      targetType: "crypto_rail",
      target: {
        network: "solana",
        address: "cdpSolanaAccount",
        symbol: "sol",
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

    beforeEach(() => {
      mockApiClient = {
        executePaymentTransferQuote: vi.fn().mockResolvedValue(mockSolanaTransfer),
      } as unknown as CdpOpenApiClientType;
      vi.clearAllMocks();
    });
    it("should create a Quote instance with correct properties", () => {
      const quote = new SolanaQuote(
        mockApiClient,
        "0xmocktransferid",
        "solana",
        "1000",
        "usd",
        "1",
        "sol",
        [
          {
            type: "exchange_fee",
            amount: "1",
            currency: "usd",
          },
        ],
      );

      expect(quote.quoteId).toBe("0xmocktransferid");
      expect(quote.network).toBe("solana");
      expect(quote.fiatAmount).toBe("1000");
      expect(quote.fiatCurrency).toBe("usd");
      expect(quote.tokenAmount).toBe("1");
      expect(quote.token).toBe("sol");
      expect(quote.fees).toEqual([
        {
          type: "exchange_fee",
          amount: "1",
          currency: "usd",
        },
      ]);
    });

    it("should execute the quote successfully", async () => {
      const quote = new SolanaQuote(
        mockApiClient,
        "0xmocktransferid",
        "solana",
        "1000",
        "usd",
        "1",
        "sol",
        [
          {
            type: "exchange_fee",
            amount: "1",
            currency: "usd",
          },
        ],
      );

      const result = await quote.execute();

      expect(mockApiClient.executePaymentTransferQuote).toHaveBeenCalledWith("0xmocktransferid");
      expect(result).toEqual({
        id: mockSolanaTransfer.id,
        network: mockSolanaTransfer.target.network,
        targetAmount: mockSolanaTransfer.targetAmount,
        targetCurrency: mockSolanaTransfer.targetCurrency,
        status: mockSolanaTransfer.status,
        transactionHash: mockSolanaTransfer.transactionHash,
      });
    });

    it("should handle API errors during execution", async () => {
      const error = new Error("API Error");
      mockApiClient.executePaymentTransferQuote = vi.fn().mockRejectedValue(error);

      const quote = new SolanaQuote(
        mockApiClient,
        "0xmocktransferid",
        "solana",
        "1000",
        "usd",
        "1",
        "sol",
        [
          {
            type: "exchange_fee",
            amount: "1",
            currency: "usd",
          },
        ],
      );

      await expect(quote.execute()).rejects.toThrow("API Error");
      expect(mockApiClient.executePaymentTransferQuote).toHaveBeenCalledWith("0xmocktransferid");
    });
  });
});
