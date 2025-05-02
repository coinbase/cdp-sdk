import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendUserOperation } from "./sendUserOperation.js";
import { encodeFunctionData } from "viem";
import { EvmUserOperationStatus, CdpOpenApiClientType } from "../../openapi-client/index.js";
import { parseEther } from "viem";
import { EvmSmartAccount } from "../../accounts/types.js";

vi.mock("viem", () => ({
  encodeFunctionData: vi.fn().mockReturnValue("0xmockedEncodedData"),
  parseEther: vi.fn().mockImplementation(() => BigInt(500000)),
}));

describe("sendUserOperation", () => {
  const mockErc20Abi = [{ name: "transfer", type: "function" }];

  let mockSmartAccount: EvmSmartAccount;
  let mockClient: CdpOpenApiClientType;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSmartAccount = {
      address: "0xsmartAccountAddress",
      owners: [
        {
          sign: vi.fn().mockResolvedValue("0xmockedSignature"),
        },
      ],
    } as unknown as EvmSmartAccount;

    mockClient = {
      prepareUserOperation: vi.fn().mockResolvedValue({
        userOpHash: "0xuserOpHash",
      }),
      sendUserOperation: vi.fn().mockResolvedValue({
        status: EvmUserOperationStatus.broadcast,
      }),
    } as unknown as CdpOpenApiClientType;
  });

  it("should throw error if calls array is empty", async () => {
    await expect(
      sendUserOperation(mockClient, {
        smartAccount: mockSmartAccount,
        calls: [],
        network: "base-sepolia",
      }),
    ).rejects.toThrow("Calls array is empty");
  });

  it("should handle calls with abi and functionName", async () => {
    const result = await sendUserOperation(mockClient, {
      smartAccount: mockSmartAccount,
      calls: [
        {
          to: "0xrecipient",
          abi: mockErc20Abi,
          functionName: "transfer",
          args: ["0xrecipient", 100],
        },
      ],
      network: "base-sepolia",
    });

    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: mockErc20Abi,
      functionName: "transfer",
      args: ["0xrecipient", 100],
    });

    expect(mockClient.prepareUserOperation).toHaveBeenCalledWith("0xsmartAccountAddress", {
      network: "base-sepolia",
      calls: [
        {
          to: "0xrecipient",
          data: "0xmockedEncodedData",
          value: "0",
        },
      ],
      paymasterUrl: undefined,
    });

    expect(mockSmartAccount.owners[0].sign).toHaveBeenCalledWith({
      hash: "0xuserOpHash",
    });
    expect(mockClient.sendUserOperation).toHaveBeenCalledWith(
      "0xsmartAccountAddress",
      "0xuserOpHash",
      {
        signature: "0xmockedSignature",
      },
      undefined,
    );

    expect(result).toEqual({
      smartAccountAddress: "0xsmartAccountAddress",
      status: EvmUserOperationStatus.broadcast,
      userOpHash: "0xuserOpHash",
    });
  });

  it("should handle direct calls with to, value and data", async () => {
    const result = await sendUserOperation(mockClient, {
      smartAccount: mockSmartAccount,
      calls: [
        {
          to: "0xrecipient",
          value: parseEther("0.0000005"),
          data: "0xcalldata",
        },
      ],
      network: "base-sepolia",
    });

    expect(mockClient.prepareUserOperation).toHaveBeenCalledWith("0xsmartAccountAddress", {
      network: "base-sepolia",
      calls: [
        {
          to: "0xrecipient",
          data: "0xcalldata",
          value: parseEther("0.0000005").toString(),
        },
      ],
      paymasterUrl: undefined,
    });

    expect(result).toEqual({
      smartAccountAddress: "0xsmartAccountAddress",
      status: EvmUserOperationStatus.broadcast,
      userOpHash: "0xuserOpHash",
    });
  });

  it("should pass paymasterUrl when provided", async () => {
    await sendUserOperation(mockClient, {
      smartAccount: mockSmartAccount,
      calls: [{ to: "0xrecipient", data: "0x" }],
      network: "base-sepolia",
      paymasterUrl: "https://paymaster.example.com",
    });

    expect(mockClient.prepareUserOperation).toHaveBeenCalledWith(
      "0xsmartAccountAddress",
      expect.objectContaining({
        paymasterUrl: "https://paymaster.example.com",
      }),
    );
  });

  it("should handle multiple calls in one operation", async () => {
    await sendUserOperation(mockClient, {
      smartAccount: mockSmartAccount,
      calls: [
        {
          to: "0xrecipient1",
          abi: mockErc20Abi,
          functionName: "transfer",
          args: ["0xrecipient1", 100],
        },
        {
          to: "0xrecipient2",
          value: parseEther("0.0000005"),
          data: "0x",
        },
      ],
      network: "base-sepolia",
    });

    expect(mockClient.prepareUserOperation).toHaveBeenCalledWith("0xsmartAccountAddress", {
      network: "base-sepolia",
      calls: [
        {
          to: "0xrecipient1",
          data: "0xmockedEncodedData",
          value: "0",
        },
        {
          to: "0xrecipient2",
          data: "0x",
          value: parseEther("0.0000005").toString(),
        },
      ],
      paymasterUrl: undefined,
    });
  });
});
