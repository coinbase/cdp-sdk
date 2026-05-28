import { describe, it, expect, vi } from "vitest";
import { fromCdpEvmAccount, type CdpEvmAccount } from "../../../src/core/wallets/evm-signer.js";

vi.mock("@x402/evm", () => ({
  toClientEvmSigner: vi.fn().mockImplementation((account) => ({
    address: account.address,
    signTypedData: account.signTypedData,
  })),
}));

describe("evm-signer", () => {
  describe("fromCdpEvmAccount", () => {
    const mockAccount: CdpEvmAccount = {
      address: "0x1234567890abcdef1234567890abcdef12345678",
      signTypedData: vi.fn().mockResolvedValue("0xmocksig"),
    };

    it("returns a signer with the correct address", () => {
      const signer = fromCdpEvmAccount(mockAccount);
      expect(signer.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
    });

    it("delegates to toClientEvmSigner", async () => {
      const { toClientEvmSigner } = await import("@x402/evm");
      fromCdpEvmAccount(mockAccount);
      expect(toClientEvmSigner).toHaveBeenCalledWith(mockAccount);
    });
  });
});
