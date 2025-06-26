import { describe, it, expect, vi, beforeEach } from "vitest";
import { transferWithViem } from "./transferWithViem.js";
import type { TransferOptions } from "./types.js";
import type { EvmAccount } from "../../../accounts/evm/types.js";
import type { WalletClient } from "viem";
import { Address, Hex } from "../../../types/misc.js";
import { parseEther, parseUnits } from "viem";
import { encodeFunctionData, erc20Abi } from "viem";
import { base, baseSepolia } from "viem/chains";

describe("transferWithViem", () => {
  let mockWalletClient: any;
  let mockAccount: EvmAccount;

  beforeEach(() => {
    mockWalletClient = {
      sendTransaction: vi.fn(),
      chain: base, // Default to base chain for tests
    };

    mockAccount = {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe("ETH transfers", () => {
    it("should transfer ETH successfully", async () => {
      const mockHash = "0x1234567890abcdef" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);

      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: parseEther("0.1"),
        token: "eth",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(1);
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount.address,
        to: transferArgs.to,
        value: transferArgs.amount,
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });

    it("should handle ETH transfer with EvmAccount recipient", async () => {
      const mockHash = "0x1234567890abcdef" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);

      const recipientAccount: EvmAccount = {
        address: "0x1234567890123456789012345678901234567890" as Address,
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
      };

      const transferArgs: TransferOptions = {
        to: recipientAccount,
        amount: parseEther("0.5"),
        token: "eth",
        network: "base-sepolia",
      };

      mockWalletClient.chain = baseSepolia; // Set chain for this test
      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount.address,
        to: recipientAccount.address,
        value: transferArgs.amount,
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });
  });

  describe("ERC20 token transfers", () => {
    it("should transfer USDC on base network", async () => {
      const mockHash = "0xabcdef1234567890" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);

      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: parseUnits("100", 6),
        token: "usdc",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(2);

      // Check approve transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(1, {
        account: mockAccount.address,
        to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC address on base
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [transferArgs.to as Address, transferArgs.amount],
        }),
      });

      // Check transfer transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(2, {
        account: mockAccount.address,
        to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC address on base
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [transferArgs.to as Address, transferArgs.amount],
        }),
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });

    it("should transfer USDC on base-sepolia network", async () => {
      const mockHash = "0xabcdef1234567890" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);
      mockWalletClient.chain = baseSepolia; // Set chain to base-sepolia for this test

      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: parseUnits("50", 6),
        token: "usdc",
        network: "base-sepolia",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(2);

      // Check approve transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(1, {
        account: mockAccount.address,
        to: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC address on base-sepolia
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [transferArgs.to as Address, transferArgs.amount],
        }),
      });

      // Check transfer transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(2, {
        account: mockAccount.address,
        to: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC address on base-sepolia
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [transferArgs.to as Address, transferArgs.amount],
        }),
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });

    it("should transfer custom ERC20 token", async () => {
      const mockHash = "0xabcdef1234567890" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);

      const customTokenAddress = "0x4200000000000000000000000000000000000006" as Hex;
      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: parseEther("10"),
        token: customTokenAddress,
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(2);

      // Check approve transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(1, {
        account: mockAccount.address,
        to: customTokenAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [transferArgs.to as Address, transferArgs.amount],
        }),
      });

      // Check transfer transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(2, {
        account: mockAccount.address,
        to: customTokenAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [transferArgs.to as Address, transferArgs.amount],
        }),
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });

    it("should handle ERC20 transfer with EvmAccount recipient", async () => {
      const mockHash = "0xabcdef1234567890" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);

      const recipientAccount: EvmAccount = {
        address: "0x1234567890123456789012345678901234567890" as Address,
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
      };

      const transferArgs: TransferOptions = {
        to: recipientAccount,
        amount: parseUnits("25", 6),
        token: "usdc",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(2);

      // Check approve transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(1, {
        account: mockAccount.address,
        to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC address on base
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [recipientAccount.address, transferArgs.amount],
        }),
      });

      // Check transfer transaction
      expect(mockWalletClient.sendTransaction).toHaveBeenNthCalledWith(2, {
        account: mockAccount.address,
        to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC address on base
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipientAccount.address, transferArgs.amount],
        }),
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });
  });

  describe("error handling", () => {
    it("should throw error when wallet client fails for ETH transfer", async () => {
      const error = new Error("Transaction failed");
      mockWalletClient.sendTransaction = vi.fn().mockRejectedValue(error);

      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: parseEther("0.1"),
        token: "eth",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      await expect(
        transferWithViem(mockWalletClient, mockAccount, transferArgsWithoutNetwork),
      ).rejects.toThrow("Transaction failed");

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it("should throw error when approve transaction fails", async () => {
      const error = new Error("Approve failed");
      mockWalletClient.sendTransaction = vi.fn().mockRejectedValue(error);

      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: parseUnits("100", 6),
        token: "usdc",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      await expect(
        transferWithViem(mockWalletClient, mockAccount, transferArgsWithoutNetwork),
      ).rejects.toThrow("Approve failed");

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it("should throw error when transfer transaction fails", async () => {
      const approveHash = "0xapprove123" as Hex;
      const error = new Error("Transfer failed");

      mockWalletClient.sendTransaction = vi
        .fn()
        .mockResolvedValueOnce(approveHash)
        .mockRejectedValueOnce(error);

      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: parseUnits("100", 6),
        token: "usdc",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      await expect(
        transferWithViem(mockWalletClient, mockAccount, transferArgsWithoutNetwork),
      ).rejects.toThrow("Transfer failed");

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle zero amount transfers", async () => {
      const mockHash = "0x1234567890abcdef" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);

      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: 0n,
        token: "eth",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount.address,
        to: transferArgs.to,
        value: 0n,
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });

    it("should handle very large amounts", async () => {
      const mockHash = "0x1234567890abcdef" as Hex;
      mockWalletClient.sendTransaction = vi.fn().mockResolvedValue(mockHash);

      const largeAmount = BigInt("1000000000000000000000000"); // 1 million ETH in wei
      const transferArgs: TransferOptions = {
        to: "0x1234567890123456789012345678901234567890" as Address,
        amount: largeAmount,
        token: "eth",
        network: "base",
      };

      const { network, ...transferArgsWithoutNetwork } = transferArgs;
      const result = await transferWithViem(
        mockWalletClient,
        mockAccount,
        transferArgsWithoutNetwork,
      );

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount.address,
        to: transferArgs.to,
        value: largeAmount,
      });

      expect(result).toEqual({
        transactionHash: mockHash,
      });
    });
  });
});
