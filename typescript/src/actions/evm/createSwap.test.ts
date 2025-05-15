import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSwap } from "./createSwap.js";
import {
  CdpOpenApiClientType,
  CreateSwapResponse,
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

  it("should throw error when liquidity is unavailable", async () => {
    mockClient.createEvmSwap = vi.fn().mockResolvedValue({
      liquidityAvailable: false,
    });

    await expect(
      createSwap(mockClient, {
        network,
        buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        sellAmount: "1000000000000000000",
        taker: "0x1234567890123456789012345678901234567890",
      }),
    ).rejects.toThrow("Swap unavailable: insufficient liquidity");
  });

  it("should successfully return a created swap when liquidity is available", async () => {
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
      sellAmount: "1000000000000000000",
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
      permit2: {
        hash: "0xpermit2hash" as Hex,
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
        to: "0xRouterAddress" as Address,
        data: "0xTransactionData" as Hex,
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    });
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
      sellAmount: "1000000000000000000",
      taker: "0x1234567890123456789012345678901234567890",
      signerAddress: "0xSignerAddress",
      gasPrice: "25000000000",
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
    expect(result.permit2).toBeNull();
  });
});
