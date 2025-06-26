import { describe, it, expect } from "vitest";
import {
  base,
  baseSepolia,
  mainnet,
  sepolia,
  holesky,
  polygon,
  polygonMumbai,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  // An unsupported chain for testing
  zora,
} from "viem/chains";
import { mapChainToNetwork } from "./chainToNetworkMapper.js";

describe("chainToNetworkMapper", () => {
  describe("mapChainToNetwork", () => {
    it("should map ethereum mainnet", () => {
      expect(mapChainToNetwork(mainnet)).toBe("ethereum");
    });

    it("should map ethereum sepolia", () => {
      expect(mapChainToNetwork(sepolia)).toBe("ethereum-sepolia");
    });

    it("should map ethereum holesky", () => {
      expect(mapChainToNetwork(holesky)).toBe("ethereum-hoodi");
    });

    it("should map base mainnet", () => {
      expect(mapChainToNetwork(base)).toBe("base");
    });

    it("should map base sepolia", () => {
      expect(mapChainToNetwork(baseSepolia)).toBe("base-sepolia");
    });

    it("should map polygon mainnet", () => {
      expect(mapChainToNetwork(polygon)).toBe("polygon");
    });

    it("should map polygon mumbai", () => {
      expect(mapChainToNetwork(polygonMumbai)).toBe("polygon-mumbai");
    });

    it("should map arbitrum mainnet", () => {
      expect(mapChainToNetwork(arbitrum)).toBe("arbitrum");
    });

    it("should map arbitrum sepolia", () => {
      expect(mapChainToNetwork(arbitrumSepolia)).toBe("arbitrum-sepolia");
    });

    it("should map optimism mainnet", () => {
      expect(mapChainToNetwork(optimism)).toBe("optimism");
    });

    it("should map optimism sepolia", () => {
      expect(mapChainToNetwork(optimismSepolia)).toBe("optimism-sepolia");
    });

    it("should return undefined for unsupported chain", () => {
      expect(mapChainToNetwork(zora)).toBeUndefined();
    });
  });
});
