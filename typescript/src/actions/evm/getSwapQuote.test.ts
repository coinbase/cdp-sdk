import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSwapQuote } from "./getSwapQuote.js";
import { GetSwapQuoteResult, SwapQuoteUnavailableResult } from "../../client/evm/evm.types.js";
import {
  CdpOpenApiClientType,
  GetQuoteResponse,
  SwapUnavailableResponse,
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

  it("should return SwapQuoteUnavailableResult when liquidity is unavailable", async () => {
    const mockResponse: SwapUnavailableResponse = {
      liquidityAvailable: false,
    };

    mockClient.getEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = (await getSwapQuote(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    })) as SwapQuoteUnavailableResult;

    expect(result).toEqual({ liquidityAvailable: false });
    expect(result.liquidityAvailable).toBe(false);
  });

  it("should successfully return a transformed swap quote when liquidity is available", async () => {
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
      sellAmount: BigInt("1000000000000000000"),
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

    // Type assertion to handle the union type
    expect(result.liquidityAvailable).toBe(true);

    // Since we've checked liquidityAvailable is true, we know it's a GetSwapQuoteResult
    const quoteResult = result as GetSwapQuoteResult;

    // Check transformed values
    expect(quoteResult.blockNumber).toBe(BigInt("12345678"));
    expect(quoteResult.buyAmount).toBe(BigInt("5000000000"));
    expect(quoteResult.buyToken).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(quoteResult.sellAmount).toBe(BigInt("1000000000000000000"));
    expect(quoteResult.sellToken).toBe("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
    expect(quoteResult.minBuyAmount).toBe(BigInt("4950000000"));
    expect(quoteResult.gas).toBe(BigInt("150000"));
    expect(quoteResult.gasPrice).toBe(BigInt("20000000000"));

    // Check fees
    expect(quoteResult.fees.gasFee).toEqual({
      amount: BigInt("1000000"),
      token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
    });
    expect(quoteResult.fees.protocolFee).toEqual({
      amount: BigInt("500000"),
      token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
    });

    // Check issues
    expect(quoteResult.issues.allowance).toEqual({
      currentAllowance: BigInt("0"),
      spender: "0xSpenderAddress" as Address,
    });
    expect(quoteResult.issues.balance).toEqual({
      token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
      currentBalance: BigInt("900000000000000000"),
      requiredBalance: BigInt("1000000000000000000"),
    });
    expect(quoteResult.issues.simulationIncomplete).toBe(false);
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
      sellAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
      signerAddress: "0xSignerAddress",
      gasPrice: BigInt("25000000000"),
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
      sellAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    // Check that it's a GetSwapQuoteResult with liquidityAvailable = true
    expect(result.liquidityAvailable).toBe(true);

    // Type assertion to work with the properties
    const quoteResult = result as GetSwapQuoteResult;
    expect(quoteResult.fees).toEqual({
      gasFee: undefined,
      protocolFee: undefined,
    });
    expect(quoteResult.issues).toEqual({
      allowance: undefined,
      balance: undefined,
      simulationIncomplete: false,
    });
  });
});
