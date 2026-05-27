import { describe, expect, it, vi, beforeEach } from "vitest";
import { getUserOperation } from "./getUserOperation.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { EvmUserOperationStatus } from "../../openapi-client/generated/coinbaseDeveloperPlatformAPIs.schemas.js";
import type { GetUserOperationOptions, UserOperation } from "../../client/evm/evm.types.js";
import type { Address, Hex } from "../../types/misc.js";

describe("getUserOperation", () => {
  let mockClient: CdpOpenApiClientType;
  const mockAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockUserOpHash =
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getUserOperation: vi.fn(),
    } as unknown as CdpOpenApiClientType;
  });

  it("should handle a successful getUserOperation call with string smartAccount", async () => {
    const mockResponse = {
      calls: [
        {
          to: "0x9876543210987654321098765432109876543210",
          value: "1000000000000000000",
          data: "0x095ea7b3000000000000000000000000000000000000000000000000000000000000dead",
        },
      ],
      network: "base",
      status: EvmUserOperationStatus.complete,
      transactionHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      userOpHash: mockUserOpHash,
    };

    (mockClient.getUserOperation as any).mockResolvedValue(mockResponse);

    const options: GetUserOperationOptions = {
      smartAccount: mockAddress,
      userOpHash: mockUserOpHash,
    };

    const result = await getUserOperation(mockClient, options);

    expect(mockClient.getUserOperation).toHaveBeenCalledWith(mockAddress, mockUserOpHash);
    expect(result).toEqual({
      calls: [
        {
          to: "0x9876543210987654321098765432109876543210" as Address,
          value: BigInt("1000000000000000000"),
          data: "0x095ea7b3000000000000000000000000000000000000000000000000000000000000dead" as Hex,
        },
      ],
      network: "base",
      status: EvmUserOperationStatus.complete,
      transactionHash: "0x1234567890123456789012345678901234567890123456789012345678901234" as Hex,
      userOpHash: mockUserOpHash,
    });
  });

  it("should handle a successful getUserOperation call with smartAccount object", async () => {
    const mockSmartAccount = {
      address: mockAddress,
      name: "Test Smart Account",
      // Other properties that might exist on a SmartAccount object
    };

    const mockResponse = {
      calls: [
        {
          to: "0x9876543210987654321098765432109876543210",
          value: "0",
          data: "0x",
        },
      ],
      network: "base-sepolia",
      status: EvmUserOperationStatus.pending,
      userOpHash: mockUserOpHash,
    };

    (mockClient.getUserOperation as any).mockResolvedValue(mockResponse);

    const options: GetUserOperationOptions = {
      smartAccount: mockSmartAccount as any,
      userOpHash: mockUserOpHash,
    };

    const result = await getUserOperation(mockClient, options);

    expect(mockClient.getUserOperation).toHaveBeenCalledWith(mockAddress, mockUserOpHash);
    expect(result).toEqual({
      calls: [
        {
          to: "0x9876543210987654321098765432109876543210" as Address,
          value: BigInt(0),
          data: "0x" as Hex,
        },
      ],
      network: "base-sepolia",
      status: EvmUserOperationStatus.pending,
      transactionHash: undefined,
      userOpHash: mockUserOpHash,
    });
  });

  it("should handle multiple calls in the response", async () => {
    const mockResponse = {
      calls: [
        {
          to: "0x1111111111111111111111111111111111111111",
          value: "1000",
          data: "0xaabbccdd",
        },
        {
          to: "0x2222222222222222222222222222222222222222",
          value: "2000",
          data: "0xeeff0011",
        },
        {
          to: "0x3333333333333333333333333333333333333333",
          value: "0",
          data: "0x12345678",
        },
      ],
      network: "ethereum",
      status: EvmUserOperationStatus.broadcast,
      userOpHash: mockUserOpHash,
    };

    (mockClient.getUserOperation as any).mockResolvedValue(mockResponse);

    const options: GetUserOperationOptions = {
      smartAccount: mockAddress,
      userOpHash: mockUserOpHash,
    };

    const result = await getUserOperation(mockClient, options);

    expect(result.calls).toHaveLength(3);
    expect(result.calls[0]).toEqual({
      to: "0x1111111111111111111111111111111111111111" as Address,
      value: BigInt(1000),
      data: "0xaabbccdd" as Hex,
    });
    expect(result.calls[1]).toEqual({
      to: "0x2222222222222222222222222222222222222222" as Address,
      value: BigInt(2000),
      data: "0xeeff0011" as Hex,
    });
    expect(result.calls[2]).toEqual({
      to: "0x3333333333333333333333333333333333333333" as Address,
      value: BigInt(0),
      data: "0x12345678" as Hex,
    });
  });

  it("should handle failed user operation status", async () => {
    const mockResponse = {
      calls: [],
      network: "base",
      status: EvmUserOperationStatus.failed,
      userOpHash: mockUserOpHash,
    };

    (mockClient.getUserOperation as any).mockResolvedValue(mockResponse);

    const options: GetUserOperationOptions = {
      smartAccount: mockAddress,
      userOpHash: mockUserOpHash,
    };

    const result = await getUserOperation(mockClient, options);

    expect(result).toEqual({
      calls: [],
      network: "base",
      status: EvmUserOperationStatus.failed,
      transactionHash: undefined,
      userOpHash: mockUserOpHash,
    });
  });

  it("should handle undefined transactionHash", async () => {
    const mockResponse = {
      calls: [
        {
          to: "0x9876543210987654321098765432109876543210",
          value: "1000",
          data: "0xabcdef",
        },
      ],
      network: "base",
      status: EvmUserOperationStatus.pending,
      userOpHash: mockUserOpHash,
      // No transactionHash
    };

    (mockClient.getUserOperation as any).mockResolvedValue(mockResponse);

    const options: GetUserOperationOptions = {
      smartAccount: mockAddress,
      userOpHash: mockUserOpHash,
    };

    const result = await getUserOperation(mockClient, options);

    expect(result.transactionHash).toBeUndefined();
  });

  it("should handle API error", async () => {
    const mockError = new Error("API request failed");
    (mockClient.getUserOperation as any).mockRejectedValue(mockError);

    const options: GetUserOperationOptions = {
      smartAccount: mockAddress,
      userOpHash: mockUserOpHash,
    };

    await expect(getUserOperation(mockClient, options)).rejects.toThrow("API request failed");
  });

  it("should properly transform value strings to bigint", async () => {
    const mockResponse = {
      calls: [
        {
          to: "0x9876543210987654321098765432109876543210",
          value: "123456789012345678901234567890",
          data: "0x",
        },
      ],
      network: "base",
      status: EvmUserOperationStatus.complete,
      transactionHash: "0xdeadbeef",
      userOpHash: mockUserOpHash,
    };

    (mockClient.getUserOperation as any).mockResolvedValue(mockResponse);

    const options: GetUserOperationOptions = {
      smartAccount: mockAddress,
      userOpHash: mockUserOpHash,
    };

    const result = await getUserOperation(mockClient, options);

    expect(result.calls[0].value).toBe(BigInt("123456789012345678901234567890"));
    expect(typeof result.calls[0].value).toBe("bigint");
  });
});
