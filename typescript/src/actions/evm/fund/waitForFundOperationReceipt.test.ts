import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitForFundOperationReceipt } from "./waitForFundOperationReceipt.js";
import { TransferStatus, CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { wait } from "../../../utils/wait.js";

vi.mock("../../../utils/wait", () => ({
  wait: vi.fn(),
}));

describe("waitForFundOperationReceipt", () => {
  const mockTransferId = "0xtransferId";
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getPaymentTransfer: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    (wait as any).mockImplementation(async (reload, isTerminal, transform) => {
      return transform(await reload());
    });
  });

  it("should handle a completed operation", async () => {
    const completedTransfer = {
      status: TransferStatus.completed,
      id: mockTransferId,
      transactionHash: "0xtxHash",
    };
    mockClient.getPaymentTransfer.mockResolvedValue(completedTransfer);

    const result = await waitForFundOperationReceipt(mockClient, {
      transferId: mockTransferId,
    });

    expect(mockClient.getPaymentTransfer).toHaveBeenCalledWith(mockTransferId);

    const waitCall = (wait as any).mock.calls[0];
    const [reloadFn, terminalCheckFn, transformFn, waitOpts] = waitCall;

    await reloadFn();
    expect(mockClient.getPaymentTransfer).toHaveBeenCalledTimes(2);

    expect(terminalCheckFn(completedTransfer)).toBe(true);

    expect(transformFn(completedTransfer)).toEqual({
      transfer: completedTransfer,
    });

    expect(waitOpts).toEqual({ timeoutSeconds: 300, intervalSeconds: 1 });

    expect(result).toEqual({
      transfer: completedTransfer,
    });
  });

  it("should handle a failed operation", async () => {
    mockClient.getPaymentTransfer.mockResolvedValue({
      status: TransferStatus.failed,
      id: mockTransferId,
    });

    const result = await waitForFundOperationReceipt(mockClient, {
      transferId: mockTransferId,
    });

    expect(result).toEqual({
      transfer: {
        status: TransferStatus.failed,
        id: mockTransferId,
      },
    });
  });

  it("should throw when operation is not terminal", async () => {
    mockClient.getPaymentTransfer.mockResolvedValue({
      status: TransferStatus.pending,
      id: mockTransferId,
    });

    (wait as any).mockImplementation(async (reload, isTerminal) => {
      const operation = await reload();
      if (!isTerminal(operation)) {
        throw new Error("Transfer is not terminal");
      }
      return operation;
    });

    await expect(
      waitForFundOperationReceipt(mockClient, {
        transferId: mockTransferId,
      }),
    ).rejects.toThrow("Transfer is not terminal");
  });

  it("should use custom waitOptions when provided", async () => {
    mockClient.getPaymentTransfer.mockResolvedValue({
      status: TransferStatus.completed,
      id: mockTransferId,
      transactionHash: "0xtxHash",
    });

    await waitForFundOperationReceipt(mockClient, {
      transferId: mockTransferId,
      waitOptions: { timeoutSeconds: 60, intervalSeconds: 2 },
    });

    const waitOptions = (wait as any).mock.calls[0][3];
    expect(waitOptions).toEqual({ timeoutSeconds: 60, intervalSeconds: 2 });
  });

  it("should correctly determine terminal states", async () => {
    mockClient.getPaymentTransfer.mockResolvedValue({
      status: TransferStatus.completed,
      id: mockTransferId,
    });

    await waitForFundOperationReceipt(mockClient, {
      transferId: mockTransferId,
    });

    const terminalCheckFn = (wait as any).mock.calls[0][1];

    expect(terminalCheckFn({ status: TransferStatus.completed })).toBe(true);
    expect(terminalCheckFn({ status: TransferStatus.failed })).toBe(true);
    expect(terminalCheckFn({ status: TransferStatus.pending })).toBe(false);
    expect(terminalCheckFn({ status: TransferStatus.created })).toBe(false);
  });
});
