import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";
import { encodeFunctionData } from "viem";

import { useSpendPermission } from "./smartAccount.use.js";
import {
  SPEND_PERMISSION_MANAGER_ABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
} from "../../../spend-permissions/constants.js";
import { sendUserOperation } from "../sendUserOperation.js";

import type { UseSpendPermissionOptions } from "./types.js";
import type { EvmSmartAccount } from "../../../accounts/evm/types.js";
import type { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import type { Address, Hex } from "../../../types/misc.js";
import type { SpendPermission } from "../../../spend-permissions/types.js";

// Mock viem functions
vi.mock("viem", () => ({
  encodeFunctionData: vi.fn(),
}));

// Mock sendUserOperation
vi.mock("../sendUserOperation.js", () => ({
  sendUserOperation: vi.fn(),
  EvmUserOperationStatus: {
    broadcast: "broadcast",
  },
}));

describe("useSpendPermission for smart accounts", () => {
  let mockClient: CdpOpenApiClientType;
  let mockSmartAccount: EvmSmartAccount;
  const mockSmartAccountAddress = "0x9876543210987654321098765432109876543210" as Address;
  const mockUserOpHash =
    "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678" as Hex;
  const mockEncodedData = "0xencodeddata1234567890" as Hex;

  const mockSpendPermission: SpendPermission = {
    account: mockSmartAccountAddress,
    spender: "0x1234567890123456789012345678901234567890" as Address,
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

    mockClient = {} as CdpOpenApiClientType;

    mockSmartAccount = {
      address: mockSmartAccountAddress,
      chain: { id: 8453 }, // base chain ID
    } as unknown as EvmSmartAccount;

    (encodeFunctionData as MockedFunction<typeof encodeFunctionData>).mockReturnValue(
      mockEncodedData,
    );
    (sendUserOperation as MockedFunction<typeof sendUserOperation>).mockResolvedValue({
      smartAccountAddress: mockSmartAccountAddress,
      status: "broadcast",
      userOpHash: mockUserOpHash,
    });
  });

  it("should successfully use a spend permission with a smart account", async () => {
    const result = await useSpendPermission(mockClient, mockSmartAccount, mockOptions);

    // Verify encodeFunctionData was called correctly
    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: SPEND_PERMISSION_MANAGER_ABI,
      functionName: "spend",
      args: [mockSpendPermission, mockOptions.value],
    });

    // Verify sendUserOperation was called correctly
    expect(sendUserOperation).toHaveBeenCalledWith(mockClient, {
      smartAccount: mockSmartAccount,
      network: "base",
      calls: [
        {
          to: SPEND_PERMISSION_MANAGER_ADDRESS,
          data: mockEncodedData,
          value: 0n,
        },
      ],
    });

    // Verify the result
    expect(result).toEqual({
      smartAccountAddress: mockSmartAccountAddress,
      status: "broadcast",
      userOpHash: mockUserOpHash,
    });
  });

  it("should throw error when sendUserOperation fails", async () => {
    const error = new Error("UserOperation failed");
    (sendUserOperation as MockedFunction<typeof sendUserOperation>).mockRejectedValue(error);

    await expect(useSpendPermission(mockClient, mockSmartAccount, mockOptions)).rejects.toThrow(
      "UserOperation failed",
    );

    expect(sendUserOperation).toHaveBeenCalled();
  });
});
