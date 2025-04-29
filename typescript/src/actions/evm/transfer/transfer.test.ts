import { describe, it, expect, vi, beforeEach } from "vitest";

import { transfer } from "./transfer.js";
import { TransferExecutionStrategy, TransferOptions } from "./types.js";
import { EvmAccount, EvmSmartAccount } from "../../../accounts/types.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { Address, Hex } from "../../../types/misc.js";

describe("transfer", () => {
  const mockApiClient = {} as CdpOpenApiClientType;

  const mockAccount: EvmAccount = {
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address,
    sign: vi.fn(),
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    signTypedData: vi.fn(),
  };

  const mockSmartAccount: EvmSmartAccount = {
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address,
    owners: [mockAccount],
    type: "evm-smart",
    transfer: vi.fn().mockResolvedValue({
      status: "success",
      transactionHash: "0xhash" as Hex,
    }),
  };

  const mockTransferStrategy: TransferExecutionStrategy<EvmAccount | EvmSmartAccount> = {
    executeTransfer: vi.fn().mockResolvedValue("0xhash" as Hex),
    waitForResult: vi.fn().mockResolvedValue({
      status: "success",
      transactionHash: "0xhash" as Hex,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should transfer ETH using string amount", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: "0.1",
      token: "eth",
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      transferArgs,
      to: transferArgs.to,
      value: expect.any(BigInt),
    });

    expect(mockTransferStrategy.waitForResult).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      publicClient: expect.any(Object),
      from: mockAccount,
      hash: "0xhash",
    });

    expect(result).toEqual({
      status: "success",
      transactionHash: "0xhash",
    });
  });

  it("should transfer USDC using string amount", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: "100",
      token: "usdc",
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      transferArgs,
      to: transferArgs.to,
      value: expect.any(BigInt),
    });

    expect(result).toEqual({
      status: "success",
      transactionHash: "0xhash",
    });
  });

  it("should transfer custom token using string amount", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: "10",
      token: "0x4200000000000000000000000000000000000006" as Hex,
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      transferArgs,
      to: transferArgs.to,
      value: expect.any(BigInt),
    });

    expect(result).toEqual({
      status: "success",
      transactionHash: "0xhash",
    });
  });

  it("should transfer using bigint amount without conversion", async () => {
    const bigintAmount = BigInt("1000000000000000000"); // 1 ETH
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: bigintAmount,
      token: "eth",
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      transferArgs,
      to: transferArgs.to,
      value: bigintAmount,
    });

    expect(result).toEqual({
      status: "success",
      transactionHash: "0xhash",
    });
  });

  it("should work with smart accounts", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: "0.1",
      token: "eth",
      network: "base",
    };

    const result = await transfer(
      mockApiClient,
      mockSmartAccount,
      transferArgs,
      mockTransferStrategy,
    );

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockSmartAccount,
      transferArgs,
      to: transferArgs.to,
      value: expect.any(BigInt),
    });

    expect(mockTransferStrategy.waitForResult).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      publicClient: expect.any(Object),
      from: mockSmartAccount,
      hash: "0xhash",
    });

    expect(result).toEqual({
      status: "success",
      transactionHash: "0xhash",
    });
  });

  it("should convert EvmAccount to to address", async () => {
    const recipientAccount: EvmAccount = {
      address: "0x1234567890123456789012345678901234567890" as Address,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    const transferArgs: TransferOptions = {
      to: recipientAccount,
      amount: "0.1",
      token: "eth",
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      transferArgs,
      to: recipientAccount.address,
      value: expect.any(BigInt),
    });

    expect(result).toEqual({
      status: "success",
      transactionHash: "0xhash",
    });
  });
});
