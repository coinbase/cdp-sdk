import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSwapQuote } from "./getSwapQuote.js";
import {
  CdpOpenApiClientType,
  GetQuoteResponse,
  EvmSwapsNetwork,
} from "../../openapi-client/index.js";
import { Address } from "../../types/misc.js";

describe("getSwapQuote", () => {
  let mockClient: CdpOpenApiClientType;
  const network: EvmSwapsNetwork = "ethereum-mainnet" as EvmSwapsNetwork;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getEvmSwapQuote: vi.fn(),
    } as unknown as CdpOpenApiClientType;
  });

  it("should throw error when liquidity is unavailable", async () => {
    mockClient.getEvmSwapQuote = vi.fn().mockResolvedValue({
      liquidityAvailable: false,
    });

    await expect(
      getSwapQuote(mockClient, {
        network,
        buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        sellAmount: "1000000000000000000",
        taker: "0x1234567890123456789012345678901234567890",
      }),
    ).rejects.toThrow("Swap unavailable: insufficient liquidity");
  });

  it("should successfully return a swap quote when liquidity is available", async () => {
    const mockResponse: GetQuoteResponse = {
      blockNumber: "12345678",
      buyAmount: "5000000000",
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: {
        gasFee: {
          amount: "1000000",
          token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        },
        protocolFee: {
          amount: "500000",
          token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        },
      },
      issues: {
        allowance: {
          currentAllowance: "0",
          spender: "0xSpenderAddress",
        },
        balance: {
          token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          currentBalance: "900000000000000000",
          requiredBalance: "1000000000000000000",
        },
        simulationIncomplete: false,
      },
      liquidityAvailable: true,
      minBuyAmount: "4950000000",
      sellAmount: "1000000000000000000",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      gas: "150000",
      gasPrice: "20000000000",
    };

    mockClient.getEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = await getSwapQuote(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: "1000000000000000000",
      taker: "0x1234567890123456789012345678901234567890",
    });

    expect(mockClient.getEvmSwapQuote).toHaveBeenCalledWith({
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: "1000000000000000000",
      taker: "0x1234567890123456789012345678901234567890",
      signerAddress: undefined,
      gasPrice: undefined,
      slippageBps: undefined,
    });

    expect(result).toEqual({
      blockNumber: "12345678",
      buyAmount: "5000000000",
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
      fees: {
        gasFee: {
          amount: "1000000",
          token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
        },
        protocolFee: {
          amount: "500000",
          token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
        },
      },
      issues: {
        allowance: {
          currentAllowance: "0",
          spender: "0xSpenderAddress" as Address,
        },
        balance: {
          token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
          currentBalance: "900000000000000000",
          requiredBalance: "1000000000000000000",
        },
        simulationIncomplete: false,
      },
      liquidityAvailable: true,
      minBuyAmount: "4950000000",
      sellAmount: "1000000000000000000",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
      gas: "150000",
      gasPrice: "20000000000",
    });
  });

  it("should handle optional parameters when provided", async () => {
    mockClient.getEvmSwapQuote = vi.fn().mockResolvedValue({
      liquidityAvailable: true,
      blockNumber: "12345678",
      buyAmount: "5000000000",
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      minBuyAmount: "4950000000",
      sellAmount: "1000000000000000000",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      gas: "150000",
      gasPrice: "20000000000",
    });

    await getSwapQuote(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: "1000000000000000000",
      taker: "0x1234567890123456789012345678901234567890",
      signerAddress: "0xSignerAddress",
      gasPrice: "25000000000",
      slippageBps: 50,
    });

    expect(mockClient.getEvmSwapQuote).toHaveBeenCalledWith({
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: "1000000000000000000",
      taker: "0x1234567890123456789012345678901234567890",
      signerAddress: "0xSignerAddress",
      gasPrice: "25000000000",
      slippageBps: 50,
    });
  });

  it("should handle null fees in the response", async () => {
    const mockResponse: GetQuoteResponse = {
      blockNumber: "12345678",
      buyAmount: "5000000000",
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: {
        allowance: null,
        balance: null,
        simulationIncomplete: false,
      },
      liquidityAvailable: true,
      minBuyAmount: "4950000000",
      sellAmount: "1000000000000000000",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      gas: "150000",
      gasPrice: "20000000000",
    };

    mockClient.getEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = await getSwapQuote(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: "1000000000000000000",
      taker: "0x1234567890123456789012345678901234567890",
    });

    expect(result.fees).toEqual({
      gasFee: null,
      protocolFee: null,
    });
    expect(result.issues).toEqual({
      allowance: null,
      balance: null,
      simulationIncomplete: false,
    });
  });
});
