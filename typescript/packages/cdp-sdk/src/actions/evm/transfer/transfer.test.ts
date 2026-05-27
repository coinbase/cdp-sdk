import { describe, it, expect, vi, beforeEach } from "vitest";

import { transfer } from "./transfer.js";
import type {
  SmartAccountTransferOptions,
  TransferExecutionStrategy,
  TransferOptions,
} from "./types.js";
import { EvmAccount, EvmSmartAccount } from "../../../accounts/evm/types.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { Address, Hex } from "../../../types/misc.js";
import { parseEther, parseUnits } from "viem";
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
    listTokenBalances: vi.fn(),
    requestFaucet: vi.fn(),
    sendUserOperation: vi.fn(),
    waitForUserOperation: vi.fn(),
    getUserOperation: vi.fn(),
    quoteFund: vi.fn(),
    fund: vi.fn(),
    waitForFundOperationReceipt: vi.fn(),
  };

  const mockTransferStrategy: TransferExecutionStrategy<EvmAccount | EvmSmartAccount> = {
    executeTransfer: vi.fn().mockResolvedValue("0xhash" as Hex),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should transfer ETH", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseEther("0.1"),
      token: "eth",
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      to: transferArgs.to,
      value: expect.any(BigInt),
      network: transferArgs.network,
      token: transferArgs.token,
    });

    expect(result).toEqual("0xhash");
  });

  it("should transfer USDC", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseUnits("100", 6),
      token: "usdc",
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      to: transferArgs.to,
      value: expect.any(BigInt),
      network: transferArgs.network,
      token: transferArgs.token,
    });

    expect(result).toEqual("0xhash");
  });

  it("should transfer custom token", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseEther("10"),
      token: "0x4200000000000000000000000000000000000006" as Hex,
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      to: transferArgs.to,
      value: expect.any(BigInt),
      network: transferArgs.network,
      token: transferArgs.token,
    });

    expect(result).toEqual("0xhash");
  });

  it("should transfer custom token on ethereum-sepolia", async () => {
    const transferArgs: TransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseEther("10"),
      token: "0x4200000000000000000000000000000000000006" as Hex,
      network: "ethereum-sepolia",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      to: transferArgs.to,
      value: expect.any(BigInt),
      network: transferArgs.network,
      token: transferArgs.token,
    });

    expect(result).toEqual("0xhash");
  });

  it("should work with smart accounts", async () => {
    const transferArgs: SmartAccountTransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseEther("0.1"),
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
      to: transferArgs.to,
      value: expect.any(BigInt),
      network: transferArgs.network,
      token: transferArgs.token,
    });

    expect(result).toEqual("0xhash");
  });

  it("should pass paymasterUrl if provided", async () => {
    const transferArgs: SmartAccountTransferOptions = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseEther("0.1"),
      token: "eth",
      network: "base",
      paymasterUrl: "https://paymaster.com",
    };

    await transfer(mockApiClient, mockSmartAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockSmartAccount,
      to: transferArgs.to,
      value: expect.any(BigInt),
      network: transferArgs.network,
      token: transferArgs.token,
      paymasterUrl: transferArgs.paymasterUrl,
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
      amount: parseEther("0.1"),
      token: "eth",
      network: "base",
    };

    const result = await transfer(mockApiClient, mockAccount, transferArgs, mockTransferStrategy);

    expect(mockTransferStrategy.executeTransfer).toHaveBeenCalledWith({
      apiClient: mockApiClient,
      from: mockAccount,
      to: recipientAccount.address,
      value: expect.any(BigInt),
      network: transferArgs.network,
      token: transferArgs.token,
    });

    expect(result).toEqual("0xhash");
  });
});
