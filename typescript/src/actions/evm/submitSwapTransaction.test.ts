import { vi, describe, it, expect, beforeEach } from "vitest";
import { MockedFunction } from "vitest";
import { Address, numberToHex, concat, size } from "viem";

import { submitSwapTransaction } from "./submitSwapTransaction.js";
import { sendTransaction } from "./sendTransaction.js";
import { CdpOpenApiClient } from "../../openapi-client/index.js";
import type { CreateSwapResponse } from "../../openapi-client/index.js";
import type { Hex } from "../../types/misc.js";
import type { TransactionRequestEIP1559 } from "viem";

// Mock dependencies
vi.mock("./sendTransaction.js", () => ({
  sendTransaction: vi.fn(),
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

vi.mock("../../openapi-client/index.js", () => ({
  CdpOpenApiClient: {
    signEvmTypedData: vi.fn(),
  },
}));

describe("submitSwapTransaction", () => {
  const mockAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockNetwork = "base";
  const mockTransactionHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  let mockSwap: CreateSwapResponse;

  beforeEach(() => {
    vi.resetAllMocks();

    mockSwap = {
      liquidityAvailable: true,
      sellToken: "0x4200000000000000000000000000000000000006",
      buyToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      sellAmount: "1000000000000000000",
      buyAmount: "1800000000",
      minBuyAmount: "1782000000",
      blockNumber: "123456",
      fees: {
        gasFee: null,
        protocolFee: null,
      },
      issues: {
        allowance: null,
        balance: null,
        simulationIncomplete: false,
      },
      transaction: {
        to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
        data: "0x12345678",
        gas: "300000",
        gasPrice: "1500000000",
        value: "0",
      },
      permit2: null,
    };

    (sendTransaction as MockedFunction<typeof sendTransaction>).mockResolvedValue({
      transactionHash: mockTransactionHash,
    });
  });

  it("should submit a swap without permit2", async () => {
    const result = await submitSwapTransaction(CdpOpenApiClient, {
      address: mockAddress,
      network: mockNetwork,
      swap: mockSwap,
    });

    // Check that sendTransaction was called with the correct arguments
    expect(sendTransaction).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        address: mockAddress,
        network: mockNetwork,
        transaction: {
          to: mockSwap.transaction.to as `0x${string}`,
          data: mockSwap.transaction.data as `0x${string}`,
          gas: BigInt(mockSwap.transaction.gas),
          value: BigInt(mockSwap.transaction.value),
        },
        idempotencyKey: undefined,
      },
    );

    expect(result).toEqual({
      transactionHash: mockTransactionHash,
    });
  });

  it("should submit a swap with permit2", async () => {
    // Add permit2 data to the mock swap
    mockSwap.permit2 = {
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
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

    const mockSignature = {
      signature: "0xabcdef1234567890",
    };
    const mockSignatureHex = "0xabcdef1234567890" as `0x${string}`;
    const mockSignatureLength = 10; // Example length
    const mockSignatureLengthHex =
      "0x0000000000000000000000000000000000000000000000000000000000000010" as `0x${string}`;
    const mockConcatenatedData =
      "0x12345678000000000000000000000000000000000000000000000000000000000000001000xabcdef1234567890" as `0x${string}`;

    (
      CdpOpenApiClient.signEvmTypedData as MockedFunction<typeof CdpOpenApiClient.signEvmTypedData>
    ).mockResolvedValue(mockSignature);
    (size as MockedFunction<typeof size>).mockReturnValue(mockSignatureLength);
    (numberToHex as MockedFunction<typeof numberToHex>).mockReturnValue(mockSignatureLengthHex);
    (concat as MockedFunction<typeof concat>).mockReturnValue(mockConcatenatedData);

    const result = await submitSwapTransaction(CdpOpenApiClient, {
      address: mockAddress,
      network: mockNetwork,
      swap: mockSwap,
    });

    // Check that signEvmTypedData was called with the correct arguments
    expect(CdpOpenApiClient.signEvmTypedData).toHaveBeenCalledWith(
      mockAddress,
      {
        domain: mockSwap.permit2.eip712.domain,
        types: mockSwap.permit2.eip712.types,
        primaryType: mockSwap.permit2.eip712.primaryType,
        message: mockSwap.permit2.eip712.message,
      },
      undefined,
    );

    // Check that size was called to get the signature length
    expect(size).toHaveBeenCalledWith(mockSignatureHex);

    // Check that numberToHex was called to convert the signature length to hex
    expect(numberToHex).toHaveBeenCalledWith(mockSignatureLength, {
      signed: false,
      size: 32,
    });

    // Check that concat was called to append the signature length and signature
    expect(concat).toHaveBeenCalledWith([
      mockSwap.transaction.data as `0x${string}`,
      mockSignatureLengthHex,
      mockSignatureHex,
    ]);

    // Check that sendTransaction was called with the modified data
    expect(sendTransaction).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        address: mockAddress,
        network: mockNetwork,
        transaction: {
          to: mockSwap.transaction.to as `0x${string}`,
          data: mockConcatenatedData,
          gas: BigInt(mockSwap.transaction.gas),
          value: BigInt(mockSwap.transaction.value),
        },
        idempotencyKey: undefined,
      },
    );

    expect(result).toEqual({
      transactionHash: mockTransactionHash,
    });
  });

  it("should pass idempotency key to API calls", async () => {
    const idempotencyKey = "test-idempotency-key";

    const result = await submitSwapTransaction(CdpOpenApiClient, {
      address: mockAddress,
      network: mockNetwork,
      swap: mockSwap,
      idempotencyKey,
    });

    // Check that sendTransaction was called with idempotencyKey
    expect(sendTransaction).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        address: mockAddress,
        network: mockNetwork,
        transaction: {
          to: mockSwap.transaction.to as `0x${string}`,
          data: mockSwap.transaction.data as `0x${string}`,
          gas: BigInt(mockSwap.transaction.gas),
          value: BigInt(mockSwap.transaction.value),
        },
        idempotencyKey,
      },
    );

    expect(result).toEqual({
      transactionHash: mockTransactionHash,
    });
  });

  it("should throw an error if transaction is not available", async () => {
    mockSwap.transaction = undefined as any;

    await expect(
      submitSwapTransaction(CdpOpenApiClient, {
        address: mockAddress,
        network: mockNetwork,
        swap: mockSwap,
      }),
    ).rejects.toThrow("No transaction data found in the swap");
  });

  it("should handle transaction with no value field", async () => {
    // Create a modified version of the transaction for the test
    const modifiedSwap = JSON.parse(JSON.stringify(mockSwap)) as CreateSwapResponse;

    // Remove the value field for the test
    const txData = modifiedSwap.transaction as any;
    delete txData.value;

    await submitSwapTransaction(CdpOpenApiClient, {
      address: mockAddress,
      network: mockNetwork,
      swap: modifiedSwap,
    });

    // Check that sendTransaction was called without the value field
    expect(sendTransaction).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        address: mockAddress,
        network: mockNetwork,
        transaction: {
          to: mockSwap.transaction.to as `0x${string}`,
          data: mockSwap.transaction.data as `0x${string}`,
          gas: BigInt(mockSwap.transaction.gas),
        },
        idempotencyKey: undefined,
      },
    );
  });

  it("should handle transaction with no gas field", async () => {
    // Create a modified version of the transaction for the test
    const modifiedSwap = JSON.parse(JSON.stringify(mockSwap)) as CreateSwapResponse;

    // Remove the gas field for the test
    const txData = modifiedSwap.transaction as any;
    delete txData.gas;

    await submitSwapTransaction(CdpOpenApiClient, {
      address: mockAddress,
      network: mockNetwork,
      swap: modifiedSwap,
    });

    // Check that sendTransaction was called without the gas field
    expect(sendTransaction).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        address: mockAddress,
        network: mockNetwork,
        transaction: {
          to: mockSwap.transaction.to as `0x${string}`,
          data: mockSwap.transaction.data as `0x${string}`,
          value: BigInt(mockSwap.transaction.value),
        },
        idempotencyKey: undefined,
      },
    );
  });
});
