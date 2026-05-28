import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSwapQuote } from "./createSwapQuote.js";
import { sendSwapTransaction } from "./sendSwapTransaction.js";
import { sendSwapOperation } from "./sendSwapOperation.js";
import { CreateSwapQuoteResult, SwapUnavailableResult } from "../../../client/evm/evm.types.js";
import {
  CdpOpenApiClientType,
  CreateSwapQuoteResponse,
  SwapUnavailableResponse,
  EvmSwapsNetwork,
} from "../../../openapi-client/index.js";
import { Address, Hex } from "../../../types/misc.js";

// Mock sendSwapTransaction and sendSwapOperation
vi.mock("./sendSwapTransaction.js", () => ({
  sendSwapTransaction: vi.fn(),
}));

vi.mock("./sendSwapOperation.js", () => ({
  sendSwapOperation: vi.fn(),
}));

describe("createSwapQuote", () => {
  let mockClient: CdpOpenApiClientType;
  const network: EvmSwapsNetwork = "ethereum" as EvmSwapsNetwork;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      createEvmSwapQuote: vi.fn(),
    } as unknown as CdpOpenApiClientType;
  });

  it("should throw an error when taker is not provided", async () => {
    await expect(
      createSwapQuote(mockClient, {
        network,
        toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        fromAmount: BigInt("1000000000000000000"),
        // taker is missing
      } as any),
    ).rejects.toThrow("taker is required for createSwapQuote");
  });

  it("should return SwapUnavailableResult when liquidity is unavailable", async () => {
    const mockResponse: SwapUnavailableResponse = {
      liquidityAvailable: false,
    };

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = (await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    })) as SwapUnavailableResult;

    expect(result).toEqual({ liquidityAvailable: false });
    expect(result.liquidityAvailable).toBe(false);
  });

  it("should successfully return a transformed swap quote when liquidity is available", async () => {
    const mockResponse: CreateSwapQuoteResponse = {
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
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
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
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

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    expect(mockClient.createEvmSwapQuote).toHaveBeenCalledWith(
      {
        network,
        toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        fromAmount: "1000000000000000000",
        taker: "0x1234567890123456789012345678901234567890",
        signerAddress: undefined,
        gasPrice: undefined,
        slippageBps: undefined,
      },
      undefined,
    );

    // Type assertion to handle the union type
    expect(result.liquidityAvailable).toBe(true);

    // Since we've checked liquidityAvailable is true, we know it's a CreateSwapQuoteResult
    const swapResult = result as CreateSwapQuoteResult;

    // Check that network is included
    expect(swapResult.network).toBe(network);

    // Check transformed values
    expect(swapResult.blockNumber).toBe(BigInt("12345678"));
    expect(swapResult.toAmount).toBe(BigInt("5000000000"));
    expect(swapResult.toToken).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(swapResult.fromAmount).toBe(BigInt("1000000000000000000"));
    expect(swapResult.fromToken).toBe("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
    expect(swapResult.minToAmount).toBe(BigInt("4950000000"));

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

    // Check transaction object properties
    expect(swapResult.transaction?.gas).toBe(BigInt("250000"));
    expect(swapResult.transaction?.gasPrice).toBe(BigInt("20000000000"));
    expect(swapResult.transaction?.value).toBe(BigInt("0"));

    // Check complete transaction object
    expect(swapResult.transaction).toEqual({
      to: "0xRouterAddress" as Address,
      data: "0xTransactionData" as Hex,
      value: BigInt("0"),
      gas: BigInt("250000"),
      gasPrice: BigInt("20000000000"),
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
    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue({
      liquidityAvailable: true,
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    });

    await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
      signerAddress: "0xSignerAddress",
      gasPrice: BigInt("25000000000"),
      slippageBps: 50,
    });

    expect(mockClient.createEvmSwapQuote).toHaveBeenCalledWith(
      {
        network,
        toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        fromAmount: "1000000000000000000",
        taker: "0x1234567890123456789012345678901234567890",
        signerAddress: "0xSignerAddress",
        gasPrice: "25000000000",
        slippageBps: 50,
      },
      undefined,
    );
  });

  it("should handle null fields in the response", async () => {
    const mockResponse: CreateSwapQuoteResponse = {
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: {
        allowance: null,
        balance: null,
        simulationIncomplete: false,
      },
      liquidityAvailable: true,
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    // Check that it's a CreateSwapQuoteResult with liquidityAvailable = true
    expect(result.liquidityAvailable).toBe(true);

    // Type assertion to work with the properties
    const swapResult = result as CreateSwapQuoteResult;
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

  it("should add an execute method to the result when liquidity is available", async () => {
    const mockResponse: CreateSwapQuoteResponse = {
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      liquidityAvailable: true,
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    // Check that execute method exists
    expect(result.liquidityAvailable).toBe(true);
    const swapResult = result as CreateSwapQuoteResult;
    expect(swapResult.execute).toBeDefined();
    expect(typeof swapResult.execute).toBe("function");

    // Mock the sendSwapTransaction response
    const mockTransactionHash = "0xmocktransactionhash" as Hex;
    (sendSwapTransaction as any).mockResolvedValue({
      transactionHash: mockTransactionHash,
    });

    // Call the execute method
    const swapResponse = await swapResult.execute({
      idempotencyKey: "test-key",
    });

    // Verify sendSwapTransaction was called with correct parameters
    expect(sendSwapTransaction).toHaveBeenCalledWith(mockClient, {
      address: "0x1234567890123456789012345678901234567890", // This is the taker address
      network: network,
      swapQuote: swapResult,
      idempotencyKey: "test-key",
    });

    // Verify the response
    expect(swapResponse).toEqual({
      transactionHash: mockTransactionHash,
    });
  });

  it("should call execute method without idempotency key", async () => {
    const mockResponse: CreateSwapQuoteResponse = {
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      liquidityAvailable: true,
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    const swapResult = result as CreateSwapQuoteResult;

    // Mock the sendSwapTransaction response
    const mockTransactionHash = "0xmocktransactionhash" as Hex;
    (sendSwapTransaction as any).mockResolvedValue({
      transactionHash: mockTransactionHash,
    });

    // Call execute without options
    await swapResult.execute({});

    // Verify sendSwapTransaction was called without idempotencyKey
    expect(sendSwapTransaction).toHaveBeenCalledWith(mockClient, {
      address: "0x1234567890123456789012345678901234567890", // This is the taker address
      network: network,
      swapQuote: swapResult,
      idempotencyKey: undefined,
    });
  });

  it("should call execute method without any arguments", async () => {
    const mockResponse: CreateSwapQuoteResponse = {
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      liquidityAvailable: true,
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const result = await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
    });

    const swapResult = result as CreateSwapQuoteResult;

    // Mock the sendSwapTransaction response
    const mockTransactionHash = "0xmocktransactionhash" as Hex;
    (sendSwapTransaction as any).mockResolvedValue({
      transactionHash: mockTransactionHash,
    });

    // Call execute without any arguments - this tests the default parameter
    await swapResult.execute();

    // Verify sendSwapTransaction was called without idempotencyKey
    expect(sendSwapTransaction).toHaveBeenCalledWith(mockClient, {
      address: "0x1234567890123456789012345678901234567890", // This is the taker address
      network: network,
      swapQuote: swapResult,
      idempotencyKey: undefined,
    });
  });

  it("should use signerAddress when provided in createSwapQuote", async () => {
    const mockResponse: CreateSwapQuoteResponse = {
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      liquidityAvailable: true,
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    const takerAddress = "0x1234567890123456789012345678901234567890";
    const signerAddress = "0xabcdef1234567890abcdef1234567890abcdef12";
    const result = await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: takerAddress,
      signerAddress: signerAddress,
    });

    const swapResult = result as CreateSwapQuoteResult;

    // Mock the sendSwapTransaction response
    const mockTransactionHash = "0xmocktransactionhash" as Hex;
    (sendSwapTransaction as any).mockResolvedValue({
      transactionHash: mockTransactionHash,
    });

    // Call execute
    await swapResult.execute({});

    // Verify sendSwapTransaction was called with the taker address (not signerAddress) for EOA transactions
    // signerAddress is only used for smart account swaps where taker is a smart contract
    expect(sendSwapTransaction).toHaveBeenCalledWith(mockClient, {
      address: takerAddress, // For EOA transactions, always use taker
      network: network,
      swapQuote: swapResult,
      idempotencyKey: undefined,
    });
  });

  it("should use sendSwapOperation for smart account execution", async () => {
    const mockResponse: CreateSwapQuoteResponse = {
      blockNumber: "12345678",
      toAmount: "5000000000",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fees: { gasFee: null, protocolFee: null },
      issues: { allowance: null, balance: null, simulationIncomplete: false },
      liquidityAvailable: true,
      minToAmount: "4950000000",
      fromAmount: "1000000000000000000",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      permit2: null,
      transaction: {
        to: "0xRouterAddress",
        data: "0xTransactionData",
        gas: "250000",
        gasPrice: "20000000000",
        value: "0",
      },
    };

    mockClient.createEvmSwapQuote = vi.fn().mockResolvedValue(mockResponse);

    // Create a mock smart account
    const mockSmartAccount = {
      address: "0x1234567890123456789012345678901234567890" as Address,
      owners: [{ address: "0xowner123" as Address }],
      type: "evm-smart" as const,
    } as unknown as any; // Use type assertion to avoid full interface implementation

    const result = await createSwapQuote(mockClient, {
      network,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      taker: "0x1234567890123456789012345678901234567890",
      smartAccount: mockSmartAccount,
    });

    const swapResult = result as CreateSwapQuoteResult;

    // Mock the sendSwapOperation response
    const mockUserOpHash = "0xmockuserophash" as Hex;
    const mockSmartAccountAddress = "0x1234567890123456789012345678901234567890" as Address;
    const mockStatus = "broadcast";
    (sendSwapOperation as any).mockResolvedValue({
      userOpHash: mockUserOpHash,
      smartAccountAddress: mockSmartAccountAddress,
      status: mockStatus,
    });

    // Call execute method
    const executeResult = await swapResult.execute({
      idempotencyKey: "test-key",
    });

    // Verify sendSwapOperation was called with correct parameters
    expect(sendSwapOperation).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      network: network,
      swapQuote: swapResult,
      idempotencyKey: "test-key",
    });

    // Verify the response for smart account execution
    expect(executeResult).toEqual({
      userOpHash: mockUserOpHash,
      smartAccountAddress: mockSmartAccountAddress,
      status: mockStatus,
    });

    // Verify sendSwapTransaction was NOT called for smart account
    expect(sendSwapTransaction).not.toHaveBeenCalled();
  });
});
