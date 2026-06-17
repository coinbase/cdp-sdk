import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./evm-signer.js", () => ({
  fromCdpEvmAccount: vi.fn().mockReturnValue("evm-signer"),
}));

vi.mock("./scw-signer.js", () => ({
  fromCdpSmartWallet: vi.fn().mockReturnValue("smart-signer"),
  cdpSmartAccountToEvmSigner: vi.fn(),
  resolveNetworkFromChainId: vi.fn(),
}));

vi.mock("./svm-signer.js", () => ({
  cdpSolanaAccountToSvmSigner: vi.fn().mockReturnValue("svm-signer"),
}));

import { fromCdpEvmAccount } from "./evm-signer.js";
import { fromCdpSmartWallet } from "./scw-signer.js";
import { cdpSolanaAccountToSvmSigner } from "./svm-signer.js";
import { toX402Signer } from "./index.js";

describe("toX402Signer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an EVM signer for evm-server accounts", () => {
    const account = {
      type: "evm-server",
      address: "0x123",
    };

    const signer = toX402Signer(account as never);

    expect(signer).toBe("evm-signer");
    expect(fromCdpEvmAccount).toHaveBeenCalledWith(account);
    expect(fromCdpSmartWallet).not.toHaveBeenCalled();
    expect(cdpSolanaAccountToSvmSigner).not.toHaveBeenCalled();
  });

  it("returns an EVM signer for evm-smart accounts", () => {
    const account = {
      type: "evm-smart",
      address: "0xabc",
    };

    const signer = toX402Signer(account as never);

    expect(signer).toBe("smart-signer");
    expect(fromCdpSmartWallet).toHaveBeenCalledWith(account);
    expect(fromCdpEvmAccount).not.toHaveBeenCalled();
    expect(cdpSolanaAccountToSvmSigner).not.toHaveBeenCalled();
  });

  it("returns an SVM signer for solana accounts", () => {
    const account = {
      address: "7v7qNf2fAKnU5pBd7kq1Bv6LhUy8Y8Vf7mJdD5H8c9Q1",
    };

    const signer = toX402Signer(account as never);

    expect(signer).toBe("svm-signer");
    expect(cdpSolanaAccountToSvmSigner).toHaveBeenCalledWith(account);
    expect(fromCdpEvmAccount).not.toHaveBeenCalled();
    expect(fromCdpSmartWallet).not.toHaveBeenCalled();
  });
});
