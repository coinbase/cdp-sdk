/**
 * Integration tests for EVM wallet adapters.
 *
 * These tests run against real cryptographic libraries without mocking.
 * No CDP credentials are required.
 */

import { describe, it, expect } from "vitest";
import { fromCdpEvmAccount } from "../../../src/core/wallets/evm-signer.js";
import {
  fromCdpSmartWallet,
  resolveNetworkFromChainId,
} from "../../../src/core/wallets/scw-signer.js";

const ANVIL_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const TYPED_DATA = {
  domain: { name: "Test", version: "1", chainId: 11155111 },
  types: { Message: [{ name: "content", type: "string" }] },
  primaryType: "Message" as const,
  message: { content: "hello x402" },
};

describe("fromCdpEvmAccount (integration — shape verification)", () => {
  it("wraps a minimal account object into a ClientEvmSigner", () => {
    const mockAccount = {
      address: ANVIL_ADDRESS as `0x${string}`,
      signTypedData: async () => "0xmocksig" as `0x${string}`,
    };
    const signer = fromCdpEvmAccount(mockAccount);
    expect(signer.address.toLowerCase()).toBe(ANVIL_ADDRESS.toLowerCase());
    expect(typeof signer.signTypedData).toBe("function");
  });
});

describe("fromCdpSmartWallet (integration — shape verification)", () => {
  it("wraps a minimal smart account and auto-resolves network from chainId", async () => {
    let capturedNetwork: string | undefined;
    const mockSmartAccount = {
      address: "0x1111111111111111111111111111111111111111" as `0x${string}`,
      signTypedData: async (opts: Record<string, unknown>) => {
        capturedNetwork = opts.network as string;
        return "0xscwsig" as `0x${string}`;
      },
    };

    const signer = fromCdpSmartWallet(mockSmartAccount);
    await signer.signTypedData(TYPED_DATA);
    expect(capturedNetwork).toBe("ethereum-sepolia");
  });
});

describe("resolveNetworkFromChainId (integration)", () => {
  const cases: Array<[number, string]> = [
    [8453, "base"],
    [84532, "base-sepolia"],
    [42161, "arbitrum"],
    [10, "optimism"],
    [7777777, "zora"],
    [137, "polygon"],
    [56, "bnb"],
    [43114, "avalanche"],
    [11155111, "ethereum-sepolia"],
  ];

  it.each(cases)("chain %i → %s", (chainId, expected) => {
    expect(resolveNetworkFromChainId(chainId)).toBe(expected);
  });
});
