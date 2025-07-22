import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitForUserOperation } from "./waitForUserOperation.js";
import { EvmUserOperationStatus, CdpOpenApiClientType } from "../../openapi-client/index.js";
import { wait } from "../../utils/wait.js";

vi.mock("../../utils/wait", () => ({
  wait: vi.fn(),
}));

describe("waitForUserOperation", () => {
  const mockAddress = "0xsmartAccountAddress";
  const mockOpHash = "0xuserOpHash";
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getUserOperation: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    (wait as any).mockImplementation(async (reload, isTerminal, transform) => {
      return transform(await reload());
    });
  });

  it("should handle a completed operation", async () => {
    const completedOp = {
      status: EvmUserOperationStatus.complete,
      userOpHash: mockOpHash,
      transactionHash: "0xtxHash",
    };
    mockClient.getUserOperation.mockResolvedValue(completedOp);

    const result = await waitForUserOperation(mockClient, {
      userOpHash: mockOpHash,
      smartAccountAddress: mockAddress,
    });

    expect(mockClient.getUserOperation).toHaveBeenCalledWith(mockAddress, mockOpHash);

    const waitCall = (wait as any).mock.calls[0];
    const [reloadFn, terminalCheckFn, transformFn, waitOpts] = waitCall;

    await reloadFn();
    expect(mockClient.getUserOperation).toHaveBeenCalledTimes(2);

    expect(terminalCheckFn(completedOp)).toBe(true);

    expect(transformFn(completedOp)).toEqual({
      smartAccountAddress: mockAddress,
      status: EvmUserOperationStatus.complete,
      transactionHash: "0xtxHash",
      userOpHash: mockOpHash,
    });

    expect(waitOpts).toEqual({ timeoutSeconds: 30 });

    expect(result).toEqual({
      smartAccountAddress: mockAddress,
      status: EvmUserOperationStatus.complete,
      transactionHash: "0xtxHash",
      userOpHash: mockOpHash,
    });
  });

  it("should handle a failed operation", async () => {
    mockClient.getUserOperation.mockResolvedValue({
      status: EvmUserOperationStatus.failed,
      userOpHash: mockOpHash,
    });

    const result = await waitForUserOperation(mockClient, {
      userOpHash: mockOpHash,
      smartAccountAddress: mockAddress,
    });

    expect(result).toEqual({
      smartAccountAddress: mockAddress,
      status: EvmUserOperationStatus.failed,
      userOpHash: mockOpHash,
    });
  });

  it("should throw when operation is not terminal", async () => {
    mockClient.getUserOperation.mockResolvedValue({
      status: EvmUserOperationStatus.pending,
      userOpHash: mockOpHash,
    });

    (wait as any).mockImplementation(async (reload, isTerminal) => {
      const operation = await reload();
      if (!isTerminal(operation)) {
        throw new Error("User operation is not terminal");
      }
      return operation;
    });

    await expect(
      waitForUserOperation(mockClient, {
        userOpHash: mockOpHash,
        smartAccountAddress: mockAddress,
      }),
    ).rejects.toThrow("User operation is not terminal");
  });

  it("should use custom waitOptions when provided", async () => {
    mockClient.getUserOperation.mockResolvedValue({
      status: EvmUserOperationStatus.complete,
      userOpHash: mockOpHash,
      transactionHash: "0xtxHash",
    });

    await waitForUserOperation(mockClient, {
      userOpHash: mockOpHash,
      smartAccountAddress: mockAddress,
      waitOptions: { timeoutSeconds: 60, intervalSeconds: 2 },
    });

    const waitOptions = (wait as any).mock.calls[0][3];
    expect(waitOptions).toEqual({ timeoutSeconds: 60, intervalSeconds: 2 });
  });

  it("should correctly determine terminal states", async () => {
    mockClient.getUserOperation.mockResolvedValue({
      status: EvmUserOperationStatus.complete,
      userOpHash: mockOpHash,
    });

    await waitForUserOperation(mockClient, {
      userOpHash: mockOpHash,
      smartAccountAddress: mockAddress,
    });

    const terminalCheckFn = (wait as any).mock.calls[0][1];

    expect(terminalCheckFn({ status: EvmUserOperationStatus.complete })).toBe(true);
    expect(terminalCheckFn({ status: EvmUserOperationStatus.failed })).toBe(true);
    expect(terminalCheckFn({ status: EvmUserOperationStatus.pending })).toBe(false);
    expect(terminalCheckFn({ status: EvmUserOperationStatus.broadcast })).toBe(false);
  });
});
