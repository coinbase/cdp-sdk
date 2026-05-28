import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fromCdpSmartWallet,
  cdpSmartAccountToEvmSigner,
  resolveNetworkFromChainId,
  type CdpSmartAccount,
} from "../../../src/core/wallets/scw-signer.js";

vi.mock("@x402/evm", () => ({
  toClientEvmSigner: vi.fn().mockImplementation((shape) => shape),
}));

describe("resolveNetworkFromChainId", () => {
  it("resolves known chain IDs to CDP network names", () => {
    expect(resolveNetworkFromChainId(8453)).toBe("base");
    expect(resolveNetworkFromChainId(84532)).toBe("base-sepolia");
    expect(resolveNetworkFromChainId(42161)).toBe("arbitrum");
    expect(resolveNetworkFromChainId(10)).toBe("optimism");
    expect(resolveNetworkFromChainId(7777777)).toBe("zora");
    expect(resolveNetworkFromChainId(137)).toBe("polygon");
    expect(resolveNetworkFromChainId(56)).toBe("bnb");
    expect(resolveNetworkFromChainId(43114)).toBe("avalanche");
    expect(resolveNetworkFromChainId(11155111)).toBe("ethereum-sepolia");
  });

  it("treats unsupported chains as unsupported", () => {
    expect(() => resolveNetworkFromChainId(1)).toThrow(
      "Unsupported chainId 1 for CDP Smart Contract Wallet",
    );
    expect(() => resolveNetworkFromChainId(421614)).toThrow(
      "Unsupported chainId 421614 for CDP Smart Contract Wallet",
    );
    expect(() => resolveNetworkFromChainId(480)).toThrow(
      "Unsupported chainId 480 for CDP Smart Contract Wallet",
    );
  });

  it("throws when chainId is undefined", () => {
    expect(() => resolveNetworkFromChainId(undefined)).toThrow(
      "Cannot derive CDP network: domain.chainId is missing",
    );
  });

  it("throws when chainId is not supported", () => {
    expect(() => resolveNetworkFromChainId(99999)).toThrow(
      "Unsupported chainId 99999 for CDP Smart Contract Wallet",
    );
  });

  it("lists supported networks in the error message", () => {
    try {
      resolveNetworkFromChainId(12345);
    } catch (e) {
      expect((e as Error).message).toContain("Supported networks:");
    }
  });
});

describe("fromCdpSmartWallet", () => {
  let mockSmartAccount: CdpSmartAccount;

  beforeEach(() => {
    mockSmartAccount = {
      address: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
      signTypedData: vi.fn().mockResolvedValue("0xmocksig"),
    };
  });

  it("returns a signer with the smart account address", () => {
    const signer = fromCdpSmartWallet(mockSmartAccount);
    expect(signer.address).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
  });

  it("calls signTypedData on the smart account with network derived from chainId", async () => {
    const signer = fromCdpSmartWallet(mockSmartAccount);

    const result = await signer.signTypedData({
      domain: {
        name: "USDC",
        version: "2",
        chainId: 11155111,
        verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      },
      types: {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
        ],
      },
      primaryType: "TransferWithAuthorization",
      message: {
        from: "0xabcdef1234567890abcdef1234567890abcdef12",
        to: "0x1234567890abcdef1234567890abcdef12345678",
      },
    });

    expect(result).toBe("0xmocksig");
    expect(mockSmartAccount.signTypedData).toHaveBeenCalledWith(
      expect.objectContaining({ network: "ethereum-sepolia" }),
    );
  });

  it("auto-resolves mainnet chain IDs", async () => {
    const signer = fromCdpSmartWallet(mockSmartAccount);

    await signer.signTypedData({
      domain: { chainId: 8453 },
      types: {},
      primaryType: "Transfer",
      message: {},
    });

    expect(mockSmartAccount.signTypedData).toHaveBeenCalledWith(
      expect.objectContaining({ network: "base" }),
    );
  });

  it("throws when domain.chainId is missing", async () => {
    const signer = fromCdpSmartWallet(mockSmartAccount);

    await expect(
      signer.signTypedData({
        domain: { name: "USDC" },
        types: {},
        primaryType: "Transfer",
        message: {},
      }),
    ).rejects.toThrow("Cannot derive CDP network: domain.chainId is missing");
  });

  it("throws when chainId is unsupported", async () => {
    const signer = fromCdpSmartWallet(mockSmartAccount);

    await expect(
      signer.signTypedData({
        domain: { chainId: 99999 },
        types: {},
        primaryType: "Transfer",
        message: {},
      }),
    ).rejects.toThrow("Unsupported chainId 99999");
  });

  it("returns the signature from the underlying smart account", async () => {
    const mockAccount: CdpSmartAccount = {
      address: "0x1111111111111111111111111111111111111111" as `0x${string}`,
      signTypedData: vi.fn().mockResolvedValue("0xdeadbeef"),
    };
    const signer = fromCdpSmartWallet(mockAccount);

    const sig = await signer.signTypedData({
      domain: { chainId: 8453 },
      types: {},
      primaryType: "Test",
      message: {},
    });

    expect(sig).toBe("0xdeadbeef");
  });

  it("passes all EIP-712 fields through to the account", async () => {
    const signer = fromCdpSmartWallet(mockSmartAccount);
    const domain = { chainId: 8453, name: "MyContract" };
    const types = { Transfer: [{ name: "amount", type: "uint256" }] };
    const primaryType = "Transfer";
    const message = { amount: "1000" };

    await signer.signTypedData({ domain, types, primaryType, message });

    expect(mockSmartAccount.signTypedData).toHaveBeenCalledWith({
      domain,
      types,
      primaryType,
      message,
      network: "base",
    });
  });
});

describe("cdpSmartAccountToEvmSigner (legacy alias)", () => {
  it("is the same function as fromCdpSmartWallet", () => {
    expect(cdpSmartAccountToEvmSigner).toBe(fromCdpSmartWallet);
  });
});
