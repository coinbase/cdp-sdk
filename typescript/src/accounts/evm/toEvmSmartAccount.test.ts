import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEvmSmartAccount } from "./toEvmSmartAccount.js";
import { EvmAccount } from "./types.js";
import { Address } from "../../types/misc.js";
import {
  CdpOpenApiClientType,
  EvmSmartAccount as EvmSmartAccountModel,
} from "../../openapi-client/index.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import type { TransferOptions } from "../../actions/evm/transfer/types.js";
import { smartAccountTransferStrategy } from "../../actions/evm/transfer/smartAccountTransferStrategy.js";
import { UserOperation } from "../../client/evm/evm.types.js";
vi.mock("../../actions/evm/transfer/transfer.js", () => ({
  ...vi.importActual("../../actions/evm/transfer/transfer.js"),
  transfer: vi.fn().mockResolvedValue({ transactionHash: "0xmocktransactionhash" }),
}));

describe("toEvmSmartAccount", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockOwner: EvmAccount;
  let mockAddress: Address;
  let mockSmartAccount: EvmSmartAccountModel;
  let mockUserOp: UserOperation;

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
    };
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
      transfer: expect.any(Function),
      listTokenBalances: expect.any(Function),
      sendUserOperation: expect.any(Function),
      waitForUserOperation: expect.any(Function),
      getUserOperation: expect.any(Function),
      requestFaucet: expect.any(Function),
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
      amount: "0.000001",
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
});
