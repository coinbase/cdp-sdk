import { describe, it, expect } from "vitest";
import * as chains from "viem/chains";

import { NETWORK_TO_CHAIN_MAP, resolveNetworkToChain } from "./networkToChainResolver.js";

describe("networkToChainResolver", () => {
  describe("NETWORK_TO_CHAIN_MAP", () => {
    it("should contain all expected network mappings", () => {
      expect(NETWORK_TO_CHAIN_MAP.base).toBe(chains.base);
      expect(NETWORK_TO_CHAIN_MAP["base-sepolia"]).toBe(chains.baseSepolia);
      expect(NETWORK_TO_CHAIN_MAP.ethereum).toBe(chains.mainnet);
      expect(NETWORK_TO_CHAIN_MAP["ethereum-sepolia"]).toBe(chains.sepolia);
      expect(NETWORK_TO_CHAIN_MAP.polygon).toBe(chains.polygon);
      expect(NETWORK_TO_CHAIN_MAP["polygon-mumbai"]).toBe(chains.polygonMumbai);
      expect(NETWORK_TO_CHAIN_MAP.arbitrum).toBe(chains.arbitrum);
      expect(NETWORK_TO_CHAIN_MAP["arbitrum-sepolia"]).toBe(chains.arbitrumSepolia);
      expect(NETWORK_TO_CHAIN_MAP.optimism).toBe(chains.optimism);
      expect(NETWORK_TO_CHAIN_MAP["optimism-sepolia"]).toBe(chains.optimismSepolia);
    });
  });

  describe("resolveNetworkToChain", () => {
    it("should resolve valid network identifiers to chains", () => {
      expect(resolveNetworkToChain("base")).toBe(chains.base);
      expect(resolveNetworkToChain("ethereum")).toBe(chains.mainnet);
      expect(resolveNetworkToChain("polygon")).toBe(chains.polygon);
    });

    it("should be case-insensitive", () => {
      expect(resolveNetworkToChain("BASE")).toBe(chains.base);
      expect(resolveNetworkToChain("Base")).toBe(chains.base);
      expect(resolveNetworkToChain("bAsE")).toBe(chains.base);
    });

    it("should throw error for unsupported network identifiers", () => {
      expect(() => resolveNetworkToChain("invalid-network")).toThrow(
        "Unsupported network identifier: invalid-network",
      );
      expect(() => resolveNetworkToChain("")).toThrow("Unsupported network identifier: ");
    });
  });
});
