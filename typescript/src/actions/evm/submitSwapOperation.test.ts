import { vi, describe, it, expect, beforeEach } from "vitest";
import { MockedFunction } from "vitest";
import { Address } from "viem";

import { submitSwapOperation } from "./submitSwapOperation.js";
import { sendUserOperation } from "./sendUserOperation.js";
import { CdpOpenApiClient } from "../../openapi-client/index.js";
import type { CreateSwapResponse } from "../../openapi-client/index.js";
import type { EvmSmartAccount } from "../../accounts/evm/types.js";
import type { Hex } from "../../types/misc.js";
import type { SendUserOperationReturnType } from "./sendUserOperation.js";

// Mock dependencies
vi.mock("./sendUserOperation.js", () => ({
  sendUserOperation: vi.fn(),
}));

vi.mock("../../openapi-client/index.js", () => ({
  CdpOpenApiClient: {},
}));

describe("submitSwapOperation", () => {
  const mockAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockNetwork = "base";
  const mockUserOpHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
  const mockStatus = "broadcast" as const; // Valid status from the SendUserOperationReturnType
  let mockSwap: CreateSwapResponse;
  let mockSmartAccount: EvmSmartAccount;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock smart account
    mockSmartAccount = {
      address: mockAddress,
      owners: [
        {
          address: "0x9876543210987654321098765432109876543210" as Address,
          sign: vi.fn(),
          signMessage: vi.fn(),
          signTransaction: vi.fn(),
          signTypedData: vi.fn(),
        },
      ],
      sendUserOperation: vi.fn(),
      waitForUserOperation: vi.fn(),
      getUserOperation: vi.fn(),
      transfer: vi.fn(),
      listTokenBalances: vi.fn(),
      requestFaucet: vi.fn(),
      swap: vi.fn(),
      type: "evm-smart",
    };

    // Mock swap data
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
        value: "1000000000",
      },
      permit2: null,
    };

    // Mock sendUserOperation response with complete SendUserOperationReturnType
    (sendUserOperation as MockedFunction<typeof sendUserOperation>).mockResolvedValue({
      userOpHash: mockUserOpHash,
      status: mockStatus,
      smartAccountAddress: mockAddress,
    } as SendUserOperationReturnType);
  });

  it("should submit a swap transaction via user operation", async () => {
    const result = await submitSwapOperation(CdpOpenApiClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      swap: mockSwap,
    });

    // Check that sendUserOperation was called with the correct arguments
    expect(sendUserOperation).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        smartAccount: mockSmartAccount,
        network: mockNetwork,
        calls: [
          {
            to: mockSwap.transaction.to as `0x${string}`,
            data: mockSwap.transaction.data as `0x${string}`,
            value: BigInt(mockSwap.transaction.value),
          },
        ],
        idempotencyKey: undefined,
      },
    );

    // Check the returned result
    expect(result).toEqual({
      userOpHash: mockUserOpHash,
      status: mockStatus,
    });
  });

  it("should pass idempotency key to sendUserOperation", async () => {
    const idempotencyKey = "test-idempotency-key";

    const result = await submitSwapOperation(CdpOpenApiClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      swap: mockSwap,
      idempotencyKey,
    });

    // Check that sendUserOperation was called with idempotencyKey
    expect(sendUserOperation).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        smartAccount: mockSmartAccount,
        network: mockNetwork,
        calls: [
          {
            to: mockSwap.transaction.to as `0x${string}`,
            data: mockSwap.transaction.data as `0x${string}`,
            value: BigInt(mockSwap.transaction.value),
          },
        ],
        idempotencyKey,
      },
    );

    // Check the returned result
    expect(result).toEqual({
      userOpHash: mockUserOpHash,
      status: mockStatus,
    });
  });

  it("should handle transaction with no value field", async () => {
    // Create a modified version of the transaction for the test
    const modifiedSwap = JSON.parse(JSON.stringify(mockSwap)) as CreateSwapResponse;
    
    // Remove the value field for the test
    const txData = modifiedSwap.transaction as any;
    delete txData.value;

    await submitSwapOperation(CdpOpenApiClient, {
      smartAccount: mockSmartAccount,
      network: mockNetwork,
      swap: modifiedSwap,
    });

    // Check that sendUserOperation was called with zero value
    expect(sendUserOperation).toHaveBeenCalledWith(
      CdpOpenApiClient,
      {
        smartAccount: mockSmartAccount,
        network: mockNetwork,
        calls: [
          {
            to: mockSwap.transaction.to as `0x${string}`,
            data: mockSwap.transaction.data as `0x${string}`,
            value: BigInt(0),
          },
        ],
        idempotencyKey: undefined,
      },
    );
  });

  it("should throw an error if transaction is not available", async () => {
    mockSwap.transaction = undefined as any;

    await expect(
      submitSwapOperation(CdpOpenApiClient, {
        smartAccount: mockSmartAccount,
        network: mockNetwork,
        swap: mockSwap,
      }),
    ).rejects.toThrow("No transaction data found in the swap");
  });
}); 