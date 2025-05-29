import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSwap } from "./createSwap.js";
import {
  CreateSwapResult,
  SwapUnavailableResult,
} from "../../client/evm/evm.types.js";
import {
  CdpOpenApiClientType,
  CreateSwapResponse,
  SwapUnavailableResponse,
  EvmSwapsNetwork,
} from "../../openapi-client/index.js";
import { Address, Hex } from "../../types/misc.js";

describe("createSwap", () => {
  let mockClient: CdpOpenApiClientType;
  const network: EvmSwapsNetwork = "ethereum-mainnet" as EvmSwapsNetwork;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      createEvmSwap: vi.fn(),
    } as unknown as CdpOpenApiClientType;
  });

  it("should return SwapUnavailableResult when liquidity is unavailable", async () => {
    const mockResponse: SwapUnavailableResponse = {
      liquidityAvailable: false,
    };

    mockClient.createEvmSwap = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwap(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    }) as SwapUnavailableResult;

    expect(result).toEqual({ liquidityAvailable: false });
    expect(result.liquidityAvailable).toBe(false);
  });

  it("should successfully return a transformed swap when liquidity is available", async () => {
    const mockResponse: CreateSwapResponse = {
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
      permit2: {
        hash: "0xpermit2hash",
        eip712: {
          domain: {
            name: "Permit2",
            chainId: 1,
            verifyingContract: "0xPermit2Contract",
          },
          types: {
            PermitSingle: [
              { name: "details", type: "PermitDetails" },
              { name: "spender", type: "address" },
              { name: "sigDeadline", type: "uint256" },
            ],
          },
          primaryType: "PermitSingle",
          message: {
            details: {
              token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              amount: "1000000000000000000",
              expiration: "1686792000",
              nonce: "0",
            },
            spender: "0xSpenderAddress",
            sigDeadline: "1686792000",
          },
        },
      },
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwap = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwap(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    expect(mockClient.createEvmSwap).toHaveBeenCalledWith({
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

    // Since we've checked liquidityAvailable is true, we know it's a CreateSwapResult
    const swapResult = result as CreateSwapResult;
    
    // Check transformed values
    expect(swapResult.blockNumber).toBe(BigInt("12345678"));
    expect(swapResult.buyAmount).toBe(BigInt("5000000000"));
    expect(swapResult.buyToken).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(swapResult.sellAmount).toBe(BigInt("1000000000000000000"));
    expect(swapResult.sellToken).toBe("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
    expect(swapResult.minBuyAmount).toBe(BigInt("4950000000"));
    expect(swapResult.gas).toBe(BigInt("250000"));
    expect(swapResult.gasPrice).toBe(BigInt("20000000000"));
    
    // Check fees
    expect(swapResult.fees.gasFee).toEqual({
      amount: BigInt("1000000"),
      token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
    });
    expect(swapResult.fees.protocolFee).toEqual({
      amount: BigInt("500000"),
      token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
    });
    
    // Check issues
    expect(swapResult.issues.allowance).toEqual({
      currentAllowance: BigInt("0"),
      spender: "0xSpenderAddress" as Address,
    });
    expect(swapResult.issues.balance).toEqual({
      token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
      currentBalance: BigInt("900000000000000000"),
      requiredBalance: BigInt("1000000000000000000"),
    });
    expect(swapResult.issues.simulationIncomplete).toBe(false);
    
    // Check transaction
    expect(swapResult.transaction).toEqual({
      to: "0xRouterAddress" as Address,
      data: "0xTransactionData" as Hex,
      value: "0",
      gas: "250000",
    });
    
    // Check permit2
    expect(swapResult.permit2?.eip712.domain).toEqual({
      name: "Permit2",
      chainId: 1,
      verifyingContract: "0xPermit2Contract" as Address,
    });
    expect(swapResult.permit2?.eip712.primaryType).toBe("PermitSingle");
  });

  it("should handle optional parameters when provided", async () => {
    mockClient.createEvmSwap = vi.fn().mockResolvedValue({
      liquidityAvailable: true,
      blockNumber: "12345678",
      buyAmount: "5000000000",
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      minBuyAmount: "4950000000",
      sellAmount: "1000000000000000000",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    });

    await createSwap(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
      signerAddress: "0xSignerAddress",
      gasPrice: BigInt("25000000000"),
      slippageBps: 50,
    });

    expect(mockClient.createEvmSwap).toHaveBeenCalledWith({
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

  it("should handle null fields in the response", async () => {
    const mockResponse: CreateSwapResponse = {
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
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwap = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwap(mockClient, {
      network,
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    // Check that it's a CreateSwapResult with liquidityAvailable = true
    expect(result.liquidityAvailable).toBe(true);

    // Type assertion to work with the properties
    const swapResult = result as CreateSwapResult;
    expect(swapResult.fees).toEqual({
      gasFee: undefined,
      protocolFee: undefined,
    });
    expect(swapResult.issues).toEqual({
      allowance: undefined,
      balance: undefined,
      simulationIncomplete: false,
    });
    expect(swapResult.permit2).toBeUndefined();
  });
});
