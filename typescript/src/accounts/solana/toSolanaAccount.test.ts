import { describe, it, expect, vi, beforeEach } from "vitest";
import { toSolanaAccount } from "./toSolanaAccount.js";
import { Account, SolanaAccount } from "./types.js";
import { CdpOpenApiClientType, PaymentMethod, Transfer } from "../../openapi-client/index.js";
import { parseUnits } from "viem";

describe("toSolanaAccount", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockAccount: Account;
  let mockAddress: string;
  let solanaAccount: SolanaAccount;
  let mockPaymentMethods: PaymentMethod[];
  let mockTransfer: Transfer;

  beforeEach(() => {
    mockAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    mockPaymentMethods = [
      {
        id: "0xmockpaymentmethodid",
        type: "card",
        actions: ["source"],
        currency: "usd",
      },
    ];

    mockTransfer = {
      id: "0xmocktransferid",
      sourceType: "payment_method",
      source: {
        id: "0xmockpaymentmethodid",
      },
      targetType: "crypto_rail",
      target: {
        network: "solana",
        address: mockAddress,
        currency: "usdc",
      },
      sourceAmount: "0.000001",
      sourceCurrency: "usd",
      targetAmount: "0.000001",
      targetCurrency: "usdc",
      userAmount: "0.000001",
      userCurrency: "usd",
      fees: [],
      status: "pending",
      createdAt: "2021-01-01T00:00:00.000Z",
      updatedAt: "2021-01-01T00:00:00.000Z",
    };

    mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockTransfer }),
      getPaymentTransfer: vi.fn().mockResolvedValue({ ...mockTransfer, status: "completed" }),
    } as unknown as CdpOpenApiClientType;

    mockAccount = {
      address: mockAddress,
      name: "test-solana-account",
      policies: [],
    };

    solanaAccount = toSolanaAccount(mockApiClient, {
      account: mockAccount,
    });
  });

  describe("Onramp", () => {
    it("should call apiClient payment APIs when quoteFund is called", async () => {
      await solanaAccount.quoteFund({
        token: "usdc",
        amount: parseUnits("0.000001", 6),
      });

      expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();
      expect(mockApiClient.createPaymentTransferQuote).toHaveBeenCalledWith({
        sourceType: "payment_method",
        source: {
          id: "0xmockpaymentmethodid",
        },
        targetType: "crypto_rail",
        target: {
          network: "solana",
          address: mockAddress,
          currency: "usdc",
        },
        amount: "0.000001",
        currency: "usdc",
      });
    });

    it("should call apiClient payment APIs when fund is called", async () => {
      await solanaAccount.fund({
        token: "usdc",
        amount: parseUnits("0.000001", 6),
      });

      expect(mockApiClient.getPaymentMethods).toHaveBeenCalled();
      expect(mockApiClient.createPaymentTransferQuote).toHaveBeenCalledWith({
        sourceType: "payment_method",
        source: {
          id: "0xmockpaymentmethodid",
        },
        targetType: "crypto_rail",
        target: {
          network: "solana",
          address: mockAddress,
          currency: "usdc",
        },
        amount: "0.000001",
        currency: "usdc",
        execute: true,
      });
    });

    it("should call apiClient getPaymentTransfer when waitForFundOperationReceipt is called", async () => {
      await solanaAccount.waitForFundOperationReceipt({
        transferId: "0xmocktransferid",
      });

      expect(mockApiClient.getPaymentTransfer).toHaveBeenCalledWith("0xmocktransferid");
    });
  });
});
