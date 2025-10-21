import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEvmSmartAccount } from "./toEvmSmartAccount.js";
import { EvmAccount } from "./types.js";
import { Address, Hex } from "../../types/misc.js";
import {
  CdpOpenApiClientType,
  EvmSmartAccount as EvmSmartAccountModel,
} from "../../openapi-client/index.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import type { TransferOptions } from "../../actions/evm/transfer/types.js";
import { smartAccountTransferStrategy } from "../../actions/evm/transfer/smartAccountTransferStrategy.js";
import { UserOperation } from "../../client/evm/evm.types.js";
import { parseUnits } from "viem";
import { signAndWrapTypedDataForSmartAccount } from "../../actions/evm/signAndWrapTypedDataForSmartAccount.js";
import { useSpendPermission } from "../../actions/evm/spend-permissions/smartAccount.use.js";

vi.mock("../../actions/evm/transfer/transfer.js", () => ({
  ...vi.importActual("../../actions/evm/transfer/transfer.js"),
  transfer: vi.fn().mockResolvedValue({ transactionHash: "0xmocktransactionhash" }),
}));

vi.mock("../../actions/evm/signAndWrapTypedDataForSmartAccount.js", () => ({
  signAndWrapTypedDataForSmartAccount: vi.fn(),
}));

vi.mock("../../actions/evm/spend-permissions/smartAccount.use.js", () => ({
  useSpendPermission: vi.fn().mockResolvedValue({ transactionHash: "0xmocktransactionhash" }),
}));

describe("toEvmSmartAccount", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockOwner: EvmAccount;
  let mockAddress: Address;
  let mockSmartAccount: EvmSmartAccountModel;
  let mockUserOp: UserOperation;
  const mockProjectPolicy = crypto.randomUUID();
  beforeEach(() => {
    mockUserOp = {
      userOpHash: "0xuserophash",
      network: "base-sepolia",
      calls: [],
      status: "complete",
      transactionHash: "0xtransactionhash",
    };

    mockApiClient = {
      signEvmTransaction: vi.fn().mockResolvedValue({ signedTransaction: "0xmocktransaction" }),
      getUserOperation: vi.fn().mockResolvedValue(mockUserOp),
    } as unknown as CdpOpenApiClientType;

    mockAddress = "0x123456789abcdef" as Address;
    mockOwner = {
      address: "0xabcdef123456789" as Address,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };
    mockSmartAccount = {
      address: mockAddress,
      owners: [],
      name: "Test Account",
      policies: [mockProjectPolicy],
    };
  });

  describe("useNetwork", () => {
    it("should return a NetworkScopedEvmSmartAccount", async () => {
      const smartAccount = toEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        owner: mockOwner,
      });

      const result = await smartAccount.useNetwork("base-sepolia");

      expect(result.network).toBe("base-sepolia");
    });
  });

  it("should create an EvmSmartAccount with the correct structure", () => {
    const result = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result).toEqual({
      address: mockAddress,
      owners: [mockOwner],
      name: "Test Account",
      type: "evm-smart",
      policies: [mockProjectPolicy],
      transfer: expect.any(Function),
      listTokenBalances: expect.any(Function),
      sendUserOperation: expect.any(Function),
      waitForUserOperation: expect.any(Function),
      getUserOperation: expect.any(Function),
      requestFaucet: expect.any(Function),
      quoteSwap: expect.any(Function),
      swap: expect.any(Function),
      signTypedData: expect.any(Function),
      useNetwork: expect.any(Function),
      useSpendPermission: expect.any(Function),
    });
  });

  it("should use the address from the provided smartAccount", () => {
    const result = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.address).toBe(mockAddress);
  });

  it("should set the owner in the owners array", () => {
    const result = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.owners).toHaveLength(1);
    expect(result.owners[0]).toBe(mockOwner);
  });

  it("should maintain the name from the provided smartAccount", () => {
    const customName = "My Custom Smart Account";
    mockSmartAccount.name = customName;

    const result = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.name).toBe(customName);
  });

  it("should have the correct type property", () => {
    const result = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.type).toBe("evm-smart");
  });

  it("should call transfer action when transfer is called", async () => {
    const smartAccount = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    const transferArgs: TransferOptions = {
      to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d" as Address,
      amount: parseUnits("0.000001", 6),
      token: "usdc",
      network: "base-sepolia",
    };

    await smartAccount.transfer(transferArgs);

    expect(transfer).toHaveBeenCalledWith(
      mockApiClient,
      smartAccount,
      transferArgs,
      smartAccountTransferStrategy,
    );
  });

  it("should call apiClient.getUserOperation when getUserOperation is called", async () => {
    const smartAccount = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    const userOp = await smartAccount.getUserOperation({
      userOpHash: "0xuserophash",
    });

    expect(mockApiClient.getUserOperation).toHaveBeenCalledWith(mockAddress, "0xuserophash");

    expect(userOp).toEqual(mockUserOp);
  });

  it("should call useSpendPermission action when calling useSpendPermission", async () => {
    const smartAccount = toEvmSmartAccount(mockApiClient, {
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    await smartAccount.useSpendPermission({
      spendPermission: {
        account: mockAddress,
        spender: mockAddress,
        token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        allowance: parseUnits("0.000001", 6),
        period: 1000,
        start: 0,
        end: 1000,
        salt: 0n,
        extraData: "0x",
      },
      value: parseUnits("0.000001", 6),
      network: "base-sepolia",
    });

    expect(useSpendPermission).toHaveBeenCalledWith(mockApiClient, smartAccount, {
      spendPermission: {
        account: mockAddress,
        spender: mockAddress,
        token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        allowance: parseUnits("0.000001", 6),
        period: 1000,
        start: 0,
        end: 1000,
        salt: 0n,
        extraData: "0x",
      },
      value: parseUnits("0.000001", 6),
      network: "base-sepolia",
    });
  });

  describe("signTypedData", () => {
    const mockSignature = "0xabcdef1234567890" as Hex;
    let mockTypedData;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(signAndWrapTypedDataForSmartAccount).mockResolvedValue({
        signature: mockSignature,
      });

      mockTypedData = {
        domain: {
          name: "Test Domain",
          version: "1",
          chainId: 8453,
          verifyingContract: "0x1234567890abcdef" as Address,
        },
        types: {
          TestMessage: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
          ],
        },
        primaryType: "TestMessage",
        message: {
          from: mockOwner.address,
          to: mockAddress,
          value: "1000000",
        },
      };
    });

    it("should sign typed data for base network", async () => {
      const smartAccount = toEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        owner: mockOwner,
      });

      const result = await smartAccount.signTypedData({
        ...mockTypedData,
        network: "base",
      });

      expect(result).toBe(mockSignature);
      expect(signAndWrapTypedDataForSmartAccount).toHaveBeenCalledWith(mockApiClient, {
        chainId: 8453n, // Base mainnet chain ID
        smartAccount,
        typedData: {
          ...mockTypedData,
          network: "base",
        },
      });
    });

    it("should sign typed data for base-sepolia network", async () => {
      const smartAccount = toEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        owner: mockOwner,
      });

      const result = await smartAccount.signTypedData({
        ...mockTypedData,
        network: "base-sepolia",
      });

      expect(result).toBe(mockSignature);
      expect(signAndWrapTypedDataForSmartAccount).toHaveBeenCalledWith(mockApiClient, {
        chainId: 84532n, // Base Sepolia chain ID
        smartAccount,
        typedData: {
          ...mockTypedData,
          network: "base-sepolia",
        },
      });
    });

    it("should pass through the typed data structure correctly", async () => {
      const smartAccount = toEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        owner: mockOwner,
      });

      const customTypedData = {
        domain: {
          name: "Custom Domain",
          version: "2",
          chainId: 8453,
          verifyingContract: "0xCustomContract" as Address,
          salt: "0xabcdef1234567890" as Hex,
        },
        types: {
          CustomType: [
            { name: "field1", type: "string" },
            { name: "field2", type: "uint256" },
          ],
        },
        primaryType: "CustomType",
        message: {
          field1: "test value",
          field2: "42",
        },
      };

      await smartAccount.signTypedData({
        ...customTypedData,
        network: "base",
      });

      expect(signAndWrapTypedDataForSmartAccount).toHaveBeenLastCalledWith(
        mockApiClient,
        expect.objectContaining({
          typedData: {
            ...customTypedData,
            network: "base",
          },
        }),
      );
    });

    it("should handle sign typed data errors", async () => {
      const errorMessage = "Failed to sign typed data";
      vi.mocked(signAndWrapTypedDataForSmartAccount).mockRejectedValueOnce(new Error(errorMessage));

      const smartAccount = toEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        owner: mockOwner,
      });

      await expect(
        smartAccount.signTypedData({
          ...mockTypedData,
          network: "base",
        }),
      ).rejects.toThrow(errorMessage);
    });
  });
});
