import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEvmServerAccount } from "./toEvmServerAccount.js";
import { EvmAccount, EvmServerAccount } from "../types.js";
import { Address, Hash } from "../../types/misc.js";
import { Transaction } from "viem";

vi.mock("viem", () => ({
  serializeTransaction: () => "0xserializedtx",
}));

describe("toEvmServerAccount", () => {
  let mockApiClient: any;
  let mockAccount: EvmAccount;
  let mockAddress: Address;
  let serverAccount: EvmServerAccount;

  beforeEach(() => {
    mockAddress = "0x123456789abcdef" as Address;

    mockApiClient = {
      signEvmMessage: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
      signEvmHash: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
      signEvmTransaction: vi.fn().mockResolvedValue({ signedTransaction: "0xmocktransaction" }),
    };

    mockAccount = {
      address: mockAddress,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    serverAccount = toEvmServerAccount(mockApiClient, {
      account: mockAccount,
    });
  });

  it("should use the address from the provided account", () => {
    expect(serverAccount.address).toBe(mockAddress);
  });

  it("should have the correct type property", () => {
    expect(serverAccount.type).toBe("evm-server");
  });

  it("should call apiClient.signEvmMessage when signMessage is called", async () => {
    const message = "Hello World";
    await serverAccount.signMessage({ message });

    expect(mockApiClient.signEvmMessage).toHaveBeenCalledWith(mockAddress, {
      message: message.toString(),
    });
  });

  it("should call apiClient.signEvmHash when sign is called", async () => {
    const hash = "0xhash123" as Hash;
    await serverAccount.sign({ hash });

    expect(mockApiClient.signEvmHash).toHaveBeenCalledWith(mockAddress, { hash });
  });

  it("should call apiClient.signEvmTransaction when signTransaction is called", async () => {
    const mockTransaction = { to: "0xrecipient" } as unknown as Transaction;

    await serverAccount.signTransaction(mockTransaction);

    expect(mockApiClient.signEvmTransaction).toHaveBeenCalledWith(mockAddress, {
      transaction: "0xserializedtx",
    });
  });

  it("should throw an error when signTypedData is called", async () => {
    await expect(serverAccount.signTypedData({} as any)).rejects.toThrow("Not implemented");
  });
});
