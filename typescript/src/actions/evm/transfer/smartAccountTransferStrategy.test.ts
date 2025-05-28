import { describe, it, expect, vi, beforeEach } from "vitest";
import { encodeFunctionData, erc20Abi, Hex, parseEther } from "viem";

import { smartAccountTransferStrategy } from "./smartAccountTransferStrategy.js";
import { getErc20Address } from "./utils.js";
import { sendUserOperation } from "../sendUserOperation.js";
import { waitForUserOperation } from "../waitForUserOperation.js";
import { Address } from "../../../types/misc.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import type { SmartAccountTransferOptions } from "./types.js";
import type { EvmSmartAccount, EvmAccount } from "../../../accounts/evm/types.js";

vi.mock("viem", async importOriginal => ({
  ...(await importOriginal<typeof vi>()),
  encodeFunctionData: vi.fn().mockReturnValue("0xmockedEncodedData"),
  erc20Abi: ["mocked_abi"],
}));

vi.mock("./utils.js", () => ({
  getErc20Address: vi.fn().mockImplementation((token, network) => {
    if (token === "usdc" && network === "base") {
      return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    }
    return token;
  }),
}));

vi.mock("../sendUserOperation.js", () => ({
  sendUserOperation: vi.fn(),
}));

vi.mock("../waitForUserOperation.js", () => ({
  waitForUserOperation: vi.fn(),
}));

describe("smartAccountTransferStrategy", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockSmartAccount: EvmSmartAccount;
  let mockOwnerAccount: EvmAccount;
  let mockTransferArgs: SmartAccountTransferOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOwnerAccount = {
      address: "0x1111111111111111111111111111111111111111" as Address,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    mockSmartAccount = {
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address,
      owners: [mockOwnerAccount],
      type: "evm-smart",
      transfer: vi.fn(),
      listTokenBalances: vi.fn(),
      requestFaucet: vi.fn(),
      sendUserOperation: vi.fn(),
      waitForUserOperation: vi.fn(),
      getUserOperation: vi.fn(),
    };

    mockApiClient = {} as unknown as CdpOpenApiClientType;

    mockTransferArgs = {
      to: "0x1234567890123456789012345678901234567890" as Address,
      amount: parseEther("0.1"),
      token: "eth",
      network: "base",
    };

    (sendUserOperation as any).mockResolvedValue({
      userOpHash: "0xuserophash",
    });

    (waitForUserOperation as any).mockResolvedValue({
      status: "complete",
    });
  });

  describe("executeTransfer", () => {
    it("should execute ETH transfer correctly", async () => {
      const toAddress = "0x1234567890123456789012345678901234567890" as Address;
      const value = 100000000000000000n; // 0.1 ETH

      const result = await smartAccountTransferStrategy.executeTransfer({
        ...mockTransferArgs,
        apiClient: mockApiClient,
        from: mockSmartAccount,
        to: toAddress,
        value,
      });

      expect(sendUserOperation).toHaveBeenCalledWith(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        calls: [
          {
            to: toAddress,
            value,
            data: "0x",
          },
        ],
      });

      expect(result.userOpHash).toBe("0xuserophash");
    });

    it("should execute ERC-20 token transfer correctly", async () => {
      const toAddress = "0x1234567890123456789012345678901234567890" as Address;
      const value = 100000n; // 0.1 USDC (6 decimals)
      const erc20Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

      const result = await smartAccountTransferStrategy.executeTransfer({
        ...mockTransferArgs,
        apiClient: mockApiClient,
        from: mockSmartAccount,
        token: "usdc",
        to: toAddress,
        value,
      });

      expect(getErc20Address).toHaveBeenCalledWith("usdc", "base");

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: erc20Abi,
        functionName: "approve",
        args: [toAddress, value],
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: erc20Abi,
        functionName: "transfer",
        args: [toAddress, value],
      });

      expect(sendUserOperation).toHaveBeenCalledWith(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        calls: [
          {
            to: erc20Address,
            data: "0xmockedEncodedData",
          },
          {
            to: erc20Address,
            data: "0xmockedEncodedData",
          },
        ],
      });

      expect(result.userOpHash).toBe("0xuserophash");
    });

    it("should execute custom token transfer correctly", async () => {
      const toAddress = "0x1234567890123456789012345678901234567890" as Address;
      const value = 100000n;
      const customTokenAddress = "0x4200000000000000000000000000000000000006" as Hex;

      const result = await smartAccountTransferStrategy.executeTransfer({
        ...mockTransferArgs,
        apiClient: mockApiClient,
        from: mockSmartAccount,
        token: customTokenAddress,
        to: toAddress,
        value,
      });

      expect(getErc20Address).toHaveBeenCalledWith(customTokenAddress, "base");

      expect(sendUserOperation).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          network: "base",
          smartAccount: mockSmartAccount,
        }),
      );

      expect(result.userOpHash).toBe("0xuserophash");
    });

    it("should pass paymasterUrl to sendUserOperation", async () => {
      const paymasterUrl = "https://some-paymaster-url.com";

      const result = await smartAccountTransferStrategy.executeTransfer({
        ...mockTransferArgs,
        apiClient: mockApiClient,
        from: mockSmartAccount,
        to: "0x1234567890123456789012345678901234567890" as Address,
        value: 100000000000000000n,
        paymasterUrl,
      });

      expect(sendUserOperation).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          network: "base",
          smartAccount: mockSmartAccount,
          paymasterUrl,
        }),
      );

      expect(result.userOpHash).toBe("0xuserophash");
    });
  });
});
