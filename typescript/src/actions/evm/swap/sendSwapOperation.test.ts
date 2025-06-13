import { vi, describe, it, expect, beforeEach } from "vitest";
import { MockedFunction } from "vitest";
import { Address, numberToHex, concat, size } from "viem";

import { sendSwapOperation } from "./sendSwapOperation.js";
import { sendUserOperation } from "../sendUserOperation.js";
import { createSwapQuote } from "./createSwapQuote.js";
import { signAndWrapTypedDataForSmartAccount } from "../signAndWrapTypedDataForSmartAccount.js";
import { createDeterministicUuidV4 } from "../../../utils/uuidV4.js";
import type {
  CreateSwapQuoteResult,
  SwapUnavailableResult,
} from "../../../client/evm/evm.types.js";
import type { EvmSmartAccount } from "../../../accounts/evm/types.js";
import type { CdpOpenApiClientType } from "../../../openapi-client/index.js";

// Mock dependencies
vi.mock("../sendUserOperation.js", () => ({
  sendUserOperation: vi.fn(),
}));

vi.mock("./createSwapQuote.js", () => ({
  createSwapQuote: vi.fn(),
}));

vi.mock("../signAndWrapTypedDataForSmartAccount.js", () => ({
  signAndWrapTypedDataForSmartAccount: vi.fn(),
}));

vi.mock("../../../utils/uuidV4.js", () => ({
  createDeterministicUuidV4: vi.fn(),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    numberToHex: vi.fn(),
    concat: vi.fn(),
    size: vi.fn(),
  };
});

describe("sendSwapOperation", () => {
  const mockSmartAccountAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockOwnerAddress = "0xabcdef1234567890abcdef1234567890abcdef12" as Address;
  const mockNetwork = "base" as const;
  const mockUserOpHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  let mockClient: CdpOpenApiClientType;
  let mockSmartAccount: EvmSmartAccount;
  let mockSwap: CreateSwapQuoteResult;

  beforeEach(() => {
    vi.resetAllMocks();

    mockClient = {} as CdpOpenApiClientType;

    mockSmartAccount = {
      address: mockSmartAccountAddress,
      owners: [
        {
          address: mockOwnerAddress,
          sign: vi.fn(),
          signMessage: vi.fn(),
          signTransaction: vi.fn(),
          signTypedData: vi.fn(),
        },
      ],
      type: "evm-smart",
    } as unknown as EvmSmartAccount;

    mockSwap = {
      liquidityAvailable: true,
      network: mockNetwork,
      fromToken: "0x4200000000000000000000000000000000000006",
      toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      fromAmount: BigInt("1000000000000000000"),
      toAmount: BigInt("1800000000"),
      minToAmount: BigInt("1782000000"),
      blockNumber: BigInt("123456"),
      fees: {
        gasFee: undefined,
        protocolFee: undefined,
      },
      issues: {
        allowance: undefined,
        balance: undefined,
        simulationIncomplete: false,
      },
      transaction: {
        to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
        data: "0x12345678",
        value: BigInt("0"),
        gas: BigInt("300000"),
        gasPrice: BigInt("1500000000"),
      },
      permit2: undefined,
      execute: vi.fn(),
    };

    (sendUserOperation as MockedFunction<typeof sendUserOperation>).mockResolvedValue({
      smartAccountAddress: mockSmartAccountAddress,
      status: "broadcast",
      userOpHash: mockUserOpHash,
    });
  });

  it("should send a swap operation without permit2", async () => {
    const result = await sendSwapOperation(mockClient, {
      smartAccount: mockSmartAccount,
      swapQuote: mockSwap,
    });

    // Check that sendUserOperation was called with the correct arguments
    expect(sendUserOperation).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      paymasterUrl: undefined,
      idempotencyKey: undefined,
      calls: [
        {
          to: mockSwap.transaction!.to,
          data: mockSwap.transaction!.data,
          // value field is omitted when it's 0 (falsy)
        },
      ],
    });

    expect(result).toEqual({
      smartAccountAddress: mockSmartAccountAddress,
      status: "broadcast",
      userOpHash: mockUserOpHash,
    });
  });

  it("should send a swap operation with permit2", async () => {
    // Add permit2 data to the mock swap
    mockSwap.permit2 = {
      eip712: {
        domain: {
          name: "Permit2",
          chainId: 8453,
          verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
        },
        types: {
          PermitTransferFrom: [
            { name: "permitted", type: "TokenPermissions" },
            { name: "spender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
          TokenPermissions: [
            { name: "token", type: "address" },
            { name: "amount", type: "uint256" },
          ],
        },
        primaryType: "PermitTransferFrom",
        message: {
          permitted: {
            token: "0x4200000000000000000000000000000000000006",
            amount: "1000000000000000000",
          },
          spender: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
          nonce: "0",
          deadline: "1717123200",
        },
      },
    };

    const mockWrappedSignature = "0xabcdef1234567890" as `0x${string}`;
    const mockSignatureLength = 10;
    const mockSignatureLengthHex =
      "0x0000000000000000000000000000000000000000000000000000000000000010" as `0x${string}`;
    const mockConcatenatedData =
      "0x12345678000000000000000000000000000000000000000000000000000000000000001000xabcdef1234567890" as `0x${string}`;

    (
      signAndWrapTypedDataForSmartAccount as MockedFunction<
        typeof signAndWrapTypedDataForSmartAccount
      >
    ).mockResolvedValue({
      signature: mockWrappedSignature,
    });
    (size as MockedFunction<typeof size>).mockReturnValue(mockSignatureLength);
    (numberToHex as MockedFunction<typeof numberToHex>).mockReturnValue(mockSignatureLengthHex);
    (concat as MockedFunction<typeof concat>).mockReturnValue(mockConcatenatedData);

    const result = await sendSwapOperation(mockClient, {
      smartAccount: mockSmartAccount,
      swapQuote: mockSwap,
    });

    // Check that signAndWrapTypedDataForSmartAccount was called with the correct arguments
    expect(signAndWrapTypedDataForSmartAccount).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      chainId: BigInt(8453),
      typedData: mockSwap.permit2!.eip712,
      ownerIndex: 0n,
      idempotencyKey: undefined,
    });

    // Check that size was called to get the signature length
    expect(size).toHaveBeenCalledWith(mockWrappedSignature);

    // Check that numberToHex was called to convert the signature length to hex
    expect(numberToHex).toHaveBeenCalledWith(mockSignatureLength, {
      signed: false,
      size: 32,
    });

    // Check that concat was called to append the signature length and signature
    expect(concat).toHaveBeenCalledWith([
      mockSwap.transaction!.data,
      mockSignatureLengthHex,
      mockWrappedSignature,
    ]);

    // Check that sendUserOperation was called with the modified data
    expect(sendUserOperation).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      paymasterUrl: undefined,
      idempotencyKey: undefined,
      calls: [
        {
          to: mockSwap.transaction!.to,
          data: mockConcatenatedData,
          // value field is omitted when it's 0 (falsy)
        },
      ],
    });

    expect(result).toEqual({
      smartAccountAddress: mockSmartAccountAddress,
      status: "broadcast",
      userOpHash: mockUserOpHash,
    });
  });

  it("should pass paymaster URL and idempotency key to user operation", async () => {
    const paymasterUrl = "https://paymaster.example.com";
    const idempotencyKey = "test-idempotency-key";

    const result = await sendSwapOperation(mockClient, {
      smartAccount: mockSmartAccount,
      swapQuote: mockSwap,
      paymasterUrl,
      idempotencyKey,
    });

    // Check that sendUserOperation was called with paymasterUrl and idempotencyKey
    expect(sendUserOperation).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      paymasterUrl,
      idempotencyKey,
      calls: [
        {
          to: mockSwap.transaction!.to,
          data: mockSwap.transaction!.data,
          // value field is omitted when it's 0 (falsy)
        },
      ],
    });

    expect(result).toEqual({
      smartAccountAddress: mockSmartAccountAddress,
      status: "broadcast",
      userOpHash: mockUserOpHash,
    });
  });

  it("should create deterministic UUID for permit2 when idempotency key is provided", async () => {
    // Add permit2 data to the mock swap
    mockSwap.permit2 = {
      eip712: {
        domain: {
          name: "Permit2",
          chainId: 8453,
          verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
        },
        types: {
          PermitTransferFrom: [
            { name: "permitted", type: "TokenPermissions" },
            { name: "spender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
          TokenPermissions: [
            { name: "token", type: "address" },
            { name: "amount", type: "uint256" },
          ],
        },
        primaryType: "PermitTransferFrom",
        message: {
          permitted: {
            token: "0x4200000000000000000000000000000000000006",
            amount: "1000000000000000000",
          },
          spender: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
          nonce: "0",
          deadline: "1717123200",
        },
      },
    };

    const idempotencyKey = "test-idempotency-key";
    const mockPermit2IdempotencyKey = "permit2-test-idempotency-key";

    (createDeterministicUuidV4 as MockedFunction<typeof createDeterministicUuidV4>).mockReturnValue(
      mockPermit2IdempotencyKey,
    );
    (
      signAndWrapTypedDataForSmartAccount as MockedFunction<
        typeof signAndWrapTypedDataForSmartAccount
      >
    ).mockResolvedValue({
      signature: "0xabcdef1234567890" as `0x${string}`,
    });

    await sendSwapOperation(mockClient, {
      smartAccount: mockSmartAccount,
      swapQuote: mockSwap,
      idempotencyKey,
    });

    // Check that deterministic UUID was created for permit2
    expect(createDeterministicUuidV4).toHaveBeenCalledWith(idempotencyKey, "permit2");

    // Check that signAndWrapTypedDataForSmartAccount was called with the permit2 idempotency key
    expect(signAndWrapTypedDataForSmartAccount).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      chainId: BigInt(8453),
      typedData: mockSwap.permit2!.eip712,
      ownerIndex: 0n,
      idempotencyKey: mockPermit2IdempotencyKey,
    });
  });

  it("should throw an error if transaction is not available", async () => {
    mockSwap.transaction = undefined;

    await expect(
      sendSwapOperation(mockClient, {
        smartAccount: mockSmartAccount,
        swapQuote: mockSwap,
      }),
    ).rejects.toThrow("No transaction data found in the swap");
  });

  it("should handle transaction with no value field", async () => {
    // Create a modified version of the transaction for the test
    const modifiedSwap: CreateSwapQuoteResult = {
      ...mockSwap,
      transaction: mockSwap.transaction
        ? ({
            to: mockSwap.transaction.to,
            data: mockSwap.transaction.data,
            gas: mockSwap.transaction.gas,
            gasPrice: mockSwap.transaction.gasPrice,
            // Intentionally omit value field
          } as any)
        : undefined,
    };

    await sendSwapOperation(mockClient, {
      smartAccount: mockSmartAccount,
      swapQuote: modifiedSwap,
    });

    // Check that sendUserOperation was called - value field is omitted when missing or 0
    expect(sendUserOperation).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      paymasterUrl: undefined,
      idempotencyKey: undefined,
      calls: [
        {
          to: mockSwap.transaction!.to,
          data: mockSwap.transaction!.data,
          // value field is omitted when undefined or 0
        },
      ],
    });
  });

  it("should create swap quote when swap options are provided", async () => {
    const swapOptions = {
      network: mockNetwork,
      toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
      fromToken: "0x4200000000000000000000000000000000000006" as `0x${string}`,
      fromAmount: BigInt("1000000000000000000"),
      taker: mockSmartAccountAddress,
      signerAddress: mockOwnerAddress,
    };

    (createSwapQuote as MockedFunction<typeof createSwapQuote>).mockResolvedValue(mockSwap);

    const result = await sendSwapOperation(mockClient, {
      smartAccount: mockSmartAccount,
      ...swapOptions,
    });

    // Check that createSwapQuote was called with the correct options
    expect(createSwapQuote).toHaveBeenCalledWith(mockClient, swapOptions);

    // Check that sendUserOperation was called with the created swap quote
    expect(sendUserOperation).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      paymasterUrl: undefined,
      idempotencyKey: undefined,
      calls: [
        {
          to: mockSwap.transaction!.to,
          data: mockSwap.transaction!.data,
          // value field is omitted when it's 0 (falsy)
        },
      ],
    });

    expect(result).toEqual({
      smartAccountAddress: mockSmartAccountAddress,
      status: "broadcast",
      userOpHash: mockUserOpHash,
    });
  });

  it("should throw error when swap options are provided but liquidity is not available", async () => {
    const swapOptions = {
      network: mockNetwork,
      toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
      fromToken: "0x4200000000000000000000000000000000000006" as `0x${string}`,
      fromAmount: BigInt("1000000000000000000"),
      taker: mockSmartAccountAddress,
      signerAddress: mockOwnerAddress,
    };

    const swapWithNoLiquidity = {
      ...mockSwap,
      liquidityAvailable: false,
    };

    (createSwapQuote as MockedFunction<typeof createSwapQuote>).mockResolvedValue(
      swapWithNoLiquidity,
    );

    await expect(
      sendSwapOperation(mockClient, {
        smartAccount: mockSmartAccount,
        ...swapOptions,
      }),
    ).rejects.toThrow("Insufficient liquidity for swap");

    // Check that createSwapQuote was called
    expect(createSwapQuote).toHaveBeenCalledWith(mockClient, swapOptions);

    // Check that sendUserOperation was NOT called
    expect(sendUserOperation).not.toHaveBeenCalled();
  });

  it("should throw error when swap quote has no liquidity available", async () => {
    const swapWithNoLiquidity: SwapUnavailableResult = {
      liquidityAvailable: false,
    };

    await expect(
      sendSwapOperation(mockClient, {
        smartAccount: mockSmartAccount,
        swapQuote: swapWithNoLiquidity as any,
      }),
    ).rejects.toThrow("Insufficient liquidity for swap");

    // Check that sendUserOperation was NOT called
    expect(sendUserOperation).not.toHaveBeenCalled();
  });

  it("should throw error when swap has allowance issues", async () => {
    const swapWithAllowanceIssue: CreateSwapQuoteResult = {
      ...mockSwap,
      issues: {
        allowance: {
          currentAllowance: BigInt("0"),
          spender: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
        },
        balance: undefined,
        simulationIncomplete: false,
      },
    };

    await expect(
      sendSwapOperation(mockClient, {
        smartAccount: mockSmartAccount,
        swapQuote: swapWithAllowanceIssue,
      }),
    ).rejects.toThrow(
      "Insufficient token allowance for swap. Current allowance: 0. " +
        "Please approve the Permit2 contract (0x000000000022D473030F116dDEE9F6B43aC78BA3) to spend your tokens.",
    );

    // Check that sendUserOperation was NOT called
    expect(sendUserOperation).not.toHaveBeenCalled();
  });
});
