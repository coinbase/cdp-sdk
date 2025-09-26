import { describe, it, expect, vi, beforeEach } from "vitest";

import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { Address } from "../../../types/misc.js";
import { parseEther } from "viem";
import { fund, EvmFundOptions } from "./fund.js";

/**
 * Tests for the deprecated fund() method.
 *
 * @deprecated The fund() method is deprecated and will be removed in a future version.
 * These tests are maintained to ensure backwards compatibility until removal.
 * Consider using our Onramp API instead. See https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order.
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

  const mockUsdcBaseTransfer = {
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

  const mockEthBaseTransfer = {
    id: "0xmocktransferid",
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

  const mockEthEthereumTransfer = {
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

  const mockUsdcEthereumTransfer = {
    id: "0xmocktransferid",
    sourceType: "payment_method",
    source: {
      id: "0xmockpaymentmethodid",
    },
    targetType: "crypto_rail",
    target: {
      network: "ethereum",
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

  it("should fund ETH on Ethereum", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockEthEthereumTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: EvmFundOptions = {
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

    expect(result.id).toEqual(mockEthEthereumTransfer.id);
    expect(result.network).toEqual(mockEthEthereumTransfer.target.network);
    expect(result.status).toEqual(mockEthEthereumTransfer.status);
    expect(result.targetAmount).toEqual(mockEthEthereumTransfer.targetAmount);
    expect(result.targetCurrency).toEqual(mockEthEthereumTransfer.targetCurrency);
    expect(result.transactionHash).toEqual(mockEthEthereumTransfer.transactionHash);
  });

  it("should fund USDC on Ethereum", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockUsdcEthereumTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: EvmFundOptions = {
      address: address,
      amount: 1000000n, // 1 USDC
      token: "usdc",
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
        currency: "usdc",
      },
      amount: "1",
      currency: "usdc",
      execute: true,
    });

    expect(result.id).toEqual(mockUsdcEthereumTransfer.id);
    expect(result.network).toEqual(mockUsdcEthereumTransfer.target.network);
    expect(result.status).toEqual(mockUsdcEthereumTransfer.status);
    expect(result.targetAmount).toEqual(mockUsdcEthereumTransfer.targetAmount);
    expect(result.targetCurrency).toEqual(mockUsdcEthereumTransfer.targetCurrency);
    expect(result.transactionHash).toEqual(mockUsdcEthereumTransfer.transactionHash);
  });

  it("should fund ETH on Base", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockEthBaseTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: EvmFundOptions = {
      address: address,
      amount: parseEther("1"),
      token: "eth",
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
        currency: "eth",
      },
      amount: "1",
      currency: "eth",
      execute: true,
    });

    expect(result.id).toEqual(mockEthBaseTransfer.id);
    expect(result.network).toEqual(mockEthBaseTransfer.target.network);
    expect(result.status).toEqual(mockEthBaseTransfer.status);
    expect(result.targetAmount).toEqual(mockEthBaseTransfer.targetAmount);
    expect(result.targetCurrency).toEqual(mockEthBaseTransfer.targetCurrency);
    expect(result.transactionHash).toEqual(mockEthBaseTransfer.transactionHash);
  });

  it("should fund USDC on Base", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      createPaymentTransferQuote: vi.fn().mockResolvedValue({ transfer: mockUsdcBaseTransfer }),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: EvmFundOptions = {
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

    expect(result.id).toEqual(mockUsdcBaseTransfer.id);
    expect(result.network).toEqual(mockUsdcBaseTransfer.target.network);
    expect(result.status).toEqual(mockUsdcBaseTransfer.status);
    expect(result.targetAmount).toEqual(mockUsdcBaseTransfer.targetAmount);
    expect(result.targetCurrency).toEqual(mockUsdcBaseTransfer.targetCurrency);
    expect(result.transactionHash).toEqual(mockUsdcBaseTransfer.transactionHash);
  });

  it("should throw error when no payment methods available", async () => {
    const mockApiClient = {
      getPaymentMethods: vi.fn().mockResolvedValue([]),
      createPaymentTransferQuote: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    const fundArgs: EvmFundOptions = {
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
