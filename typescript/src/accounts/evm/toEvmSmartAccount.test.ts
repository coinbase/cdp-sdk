import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEvmSmartAccount } from "./toEvmSmartAccount.js";
import { EvmAccount } from "../types.js";
import { Address } from "../../types/misc.js";
import { EvmSmartAccount as EvmSmartAccountModel } from "../../openapi-client/index.js";

describe("toEvmSmartAccount", () => {
  let mockOwner: EvmAccount;
  let mockAddress: Address;
  let mockSmartAccount: EvmSmartAccountModel;

  beforeEach(() => {
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
    const result = toEvmSmartAccount({
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result).toEqual({
      address: mockAddress,
      owners: [mockOwner],
      name: "Test Account",
      type: "evm-smart",
    });
  });

  it("should use the address from the provided smartAccount", () => {
    const result = toEvmSmartAccount({
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.address).toBe(mockAddress);
  });

  it("should set the owner in the owners array", () => {
    const result = toEvmSmartAccount({
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.owners).toHaveLength(1);
    expect(result.owners[0]).toBe(mockOwner);
  });

  it("should maintain the name from the provided smartAccount", () => {
    const customName = "My Custom Smart Account";
    mockSmartAccount.name = customName;

    const result = toEvmSmartAccount({
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.name).toBe(customName);
  });

  it("should have the correct type property", () => {
    const result = toEvmSmartAccount({
      smartAccount: mockSmartAccount,
      owner: mockOwner,
    });

    expect(result.type).toBe("evm-smart");
  });
});
