import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";
import { encodeFunctionData } from "viem";

import { useSpendPermission } from "./account.use.js";
import {
  SPEND_PERMISSION_MANAGER_ABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
} from "../../../spend-permissions/constants.js";
import { serializeEIP1559Transaction } from "../../../utils/serializeTransaction.js";

import type { UseSpendPermissionOptions } from "./types.js";
import type { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import type { Address, Hex } from "../../../types/misc.js";
import type { SpendPermission } from "../../../spend-permissions/types.js";

// Mock viem functions
vi.mock("viem", () => ({
  encodeFunctionData: vi.fn(),
}));

// Mock internal utilities
vi.mock("../../../utils/serializeTransaction.js", () => ({
  serializeEIP1559Transaction: vi.fn(),
}));

describe("useSpendPermission", () => {
  let mockClient: CdpOpenApiClientType;
  const mockAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockTransactionHash =
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
  const mockEncodedData = "0xencodeddata1234567890" as Hex;
  const mockSerializedTransaction =
    "0x02f86c0180808080809412345678901234567890123456789012345678908080c080a01234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefa01234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x02${string}`;

  const mockSpendPermission: SpendPermission = {
    account: "0x1111111111111111111111111111111111111111" as Address,
    spender: mockAddress,
    token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address, // ETH
    allowance: 1000000000000000000n, // 1 ETH
    period: 86400, // 1 day
    start: 1700000000,
    end: 1700086400,
    salt: 12345n,
    extraData: "0x" as Hex,
  };

  const mockOptions: UseSpendPermissionOptions = {
    spendPermission: mockSpendPermission,
    value: 500000000000000000n, // 0.5 ETH
    network: "base" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      sendEvmTransaction: vi.fn().mockResolvedValue({
        transactionHash: mockTransactionHash,
      }),
    } as unknown as CdpOpenApiClientType;

    (encodeFunctionData as MockedFunction<typeof encodeFunctionData>).mockReturnValue(
      mockEncodedData,
    );
    (
      serializeEIP1559Transaction as MockedFunction<typeof serializeEIP1559Transaction>
    ).mockReturnValue(mockSerializedTransaction);
  });

  it("should successfully use a spend permission", async () => {
    const result = await useSpendPermission(mockClient, mockAddress, mockOptions);

    // Verify encodeFunctionData was called correctly
    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: SPEND_PERMISSION_MANAGER_ABI,
      functionName: "spend",
      args: [mockSpendPermission, mockOptions.value],
    });

    // Verify serializeEIP1559Transaction was called correctly
    expect(serializeEIP1559Transaction).toHaveBeenCalledWith({
      to: SPEND_PERMISSION_MANAGER_ADDRESS,
      data: mockEncodedData,
    });

    // Verify sendEvmTransaction was called correctly
    expect(mockClient.sendEvmTransaction).toHaveBeenCalledWith(mockAddress, {
      transaction: mockSerializedTransaction,
      network: "base",
    });

    // Verify the result
    expect(result).toEqual({
      transactionHash: mockTransactionHash,
    });
  });

  it("should throw API error when sendEvmTransaction fails", async () => {
    const apiError = new Error("API request failed");
    mockClient.sendEvmTransaction = vi.fn().mockRejectedValue(apiError);

    await expect(useSpendPermission(mockClient, mockAddress, mockOptions)).rejects.toThrow(
      "API request failed",
    );

    expect(mockClient.sendEvmTransaction).toHaveBeenCalled();
  });
});
