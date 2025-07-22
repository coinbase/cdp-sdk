import { describe, it, expect, vi, beforeEach } from "vitest";
import { encodeFunctionData, erc20Abi, parseEther } from "viem";

import { accountTransferStrategy } from "./accountTransferStrategy.js";
import { getErc20Address } from "./utils.js";
import { serializeEIP1559Transaction } from "../../../utils/serializeTransaction.js";
import type { Address } from "../../../types/misc.js";
import type { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import type { EvmAccount } from "../../../accounts/evm/types.js";
import type { TransferOptions } from "./types.js";
import type { Hex } from "../../../types/misc.js";

vi.mock("viem", async importOriginal => ({
  ...(await importOriginal<typeof vi>()),
  encodeFunctionData: vi.fn().mockReturnValue("0xmockedEncodedData"),
  erc20Abi: ["mocked_abi"],
  WaitForTransactionReceiptTimeoutError: class WaitForTransactionReceiptTimeoutError extends Error {
    constructor() {
      super("Transaction timed out");
      this.name = "WaitForTransactionReceiptTimeoutError";
    }
  },
}));

vi.mock("./utils.js", () => ({
  getErc20Address: vi.fn().mockImplementation((token, network) => {
    if (token === "usdc" && network === "base") {
      return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    }
    return token;
  }),
}));

vi.mock("../../../utils/serializeTransaction.js", () => ({
  serializeEIP1559Transaction: vi.fn().mockReturnValue("0xserializedTransaction"),
}));

describe("accountTransferStrategy", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockAccount: EvmAccount;
  let mockTransferArgs: TransferOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      sendEvmTransaction: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    mockAccount = {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    mockTransferArgs = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseEther("0.1"),
      token: "eth",
      network: "base",
    };
  });

  describe("executeTransfer", () => {
    it("should execute ETH transfer correctly", async () => {
      const toAddress = "0x1234567890123456789012345678901234567890" as Address;
      const value = 100000000000000000n; // 0.1 ETH

      (mockApiClient.sendEvmTransaction as any).mockResolvedValue({
        transactionHash: "0xhash1",
      });

      const result = await accountTransferStrategy.executeTransfer({
        ...mockTransferArgs,
        apiClient: mockApiClient,
        from: mockAccount,
        to: toAddress,
        value,
      });

      expect(serializeEIP1559Transaction).toHaveBeenCalledWith({
        value,
        to: toAddress,
      });

      expect(mockApiClient.sendEvmTransaction).toHaveBeenCalledWith(mockAccount.address, {
        transaction: "0xserializedTransaction",
        network: "base",
      });

      expect(result.transactionHash).toBe("0xhash1");
    });

    it("should execute ERC-20 token transfer correctly", async () => {
      const toAddress = "0x1234567890123456789012345678901234567890" as Address;
      const value = 100000n; // 0.1 USDC (6 decimals)
      const erc20Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

      (mockApiClient.sendEvmTransaction as any)
        .mockResolvedValueOnce({
          transactionHash: "0xhash-approve",
        })
        .mockResolvedValueOnce({
          transactionHash: "0xhash-transfer",
        });

      const result = await accountTransferStrategy.executeTransfer({
        ...mockTransferArgs,
        apiClient: mockApiClient,
        from: mockAccount,
        to: toAddress,
        token: "usdc",
        value,
      });

      expect(getErc20Address).toHaveBeenCalledWith("usdc", "base");
      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: erc20Abi,
        functionName: "approve",
        args: [toAddress, value],
      });
      expect(serializeEIP1559Transaction).toHaveBeenCalledWith({
        to: erc20Address,
        data: "0xmockedEncodedData",
      });
      expect(mockApiClient.sendEvmTransaction).toHaveBeenCalledWith(mockAccount.address, {
        transaction: "0xserializedTransaction",
        network: "base",
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: erc20Abi,
        functionName: "transfer",
        args: [toAddress, value],
      });
      expect(serializeEIP1559Transaction).toHaveBeenCalledWith({
        to: erc20Address,
        data: "0xmockedEncodedData",
      });

      expect(result.transactionHash).toBe("0xhash-transfer");
    });

    it("should execute custom token transfer correctly", async () => {
      const toAddress = "0x1234567890123456789012345678901234567890" as Address;
      const value = 100000n;
      const customTokenAddress = "0x4200000000000000000000000000000000000006" as Hex;

      (mockApiClient.sendEvmTransaction as any)
        .mockResolvedValueOnce({
          transactionHash: "0xhash-approve",
        })
        .mockResolvedValueOnce({
          transactionHash: "0xhash-transfer",
        });

      const result = await accountTransferStrategy.executeTransfer({
        ...mockTransferArgs,
        apiClient: mockApiClient,
        from: mockAccount,
        token: customTokenAddress,
        to: toAddress,
        value,
      });

      expect(getErc20Address).toHaveBeenCalledWith(customTokenAddress, "base");
      expect(result.transactionHash).toBe("0xhash-transfer");
    });
  });
});
