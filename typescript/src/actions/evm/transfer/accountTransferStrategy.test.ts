import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  encodeFunctionData,
  erc20Abi,
  Hex,
  TransactionReceipt,
  WaitForTransactionReceiptTimeoutError,
} from "viem";

import { accountTransferStrategy } from "./accountTransferStrategy.js";
import { getErc20Address } from "./utils.js";
import { EvmAccount } from "../../../accounts/types.js";
import { serializeEIP1559Transaction } from "../../../utils/serializeTransaction.js";
import { Address } from "../../../types/misc.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { TransferOptions } from "./types.js";

vi.mock("viem", () => ({
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
  let mockPublicClient: any;
  let mockAccount: EvmAccount;
  let mockTransferArgs: TransferOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      sendEvmTransaction: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    mockPublicClient = {
      waitForTransactionReceipt: vi.fn(),
      chain: {
        blockExplorers: {
          default: {
            url: "https://explorer.example.org",
          },
        },
      },
    };

    mockAccount = {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    mockTransferArgs = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: "0.1",
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
        apiClient: mockApiClient,
        from: mockAccount,
        transferArgs: {
          ...mockTransferArgs,
          token: "eth",
        },
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

      expect(result).toBe("0xhash1");
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
        apiClient: mockApiClient,
        from: mockAccount,
        transferArgs: {
          ...mockTransferArgs,
          token: "usdc",
        },
        to: toAddress,
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

      expect(result).toBe("0xhash-transfer");
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
        apiClient: mockApiClient,
        from: mockAccount,
        transferArgs: {
          ...mockTransferArgs,
          token: customTokenAddress,
        },
        to: toAddress,
        value,
      });

      expect(getErc20Address).toHaveBeenCalledWith(customTokenAddress, "base");
      expect(result).toBe("0xhash-transfer");
    });
  });

  describe("waitForResult", () => {
    it("should handle successful transaction", async () => {
      const hash = "0xsuccesshash" as Hex;

      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: "success",
      } as TransactionReceipt);

      const result = await accountTransferStrategy.waitForResult({
        publicClient: mockPublicClient,
        hash,
      } as any);

      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash,
      });

      expect(result).toEqual({
        status: "success",
        transactionHash: hash,
      });
    });

    it("should throw error for failed transaction", async () => {
      const hash = "0xfailedhash" as Hex;

      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: "reverted",
      } as TransactionReceipt);

      await expect(
        accountTransferStrategy.waitForResult({
          publicClient: mockPublicClient,
          hash,
        } as any),
      ).rejects.toThrow(
        `Transaction failed. Check the transaction on the explorer: https://explorer.example.org/tx/${hash}`,
      );
    });

    it("should handle transaction timeout", async () => {
      const hash = "0xtimeouthash" as Hex;

      mockPublicClient.waitForTransactionReceipt.mockRejectedValue(
        new WaitForTransactionReceiptTimeoutError({ hash }),
      );

      await expect(
        accountTransferStrategy.waitForResult({
          publicClient: mockPublicClient,
          hash,
        } as any),
      ).rejects.toThrow(
        `Transaction timed out. Check the transaction on the explorer: https://explorer.example.org/tx/${hash}`,
      );
    });

    it("should rethrow other errors", async () => {
      const hash = "0xerrorhash" as Hex;
      const error = new Error("Some other error");

      mockPublicClient.waitForTransactionReceipt.mockRejectedValue(error);

      await expect(
        accountTransferStrategy.waitForResult({
          publicClient: mockPublicClient,
          hash,
        } as any),
      ).rejects.toThrow(error);
    });
  });
});
