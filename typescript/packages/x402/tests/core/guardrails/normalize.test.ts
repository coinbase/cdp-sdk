import { describe, it, expect } from "vitest";

import {
  normalizeAsset,
  normalizeNetwork,
  normalizePayee,
} from "../../../src/core/guardrails/normalize.js";
import { SpendControlError } from "../../../src/core/guardrails/types.js";

describe("guardrails/normalize", () => {
  describe("normalizeNetwork", () => {
    it("passes through CAIP-2 EVM networks", () => {
      expect(normalizeNetwork("eip155:8453")).toBe("eip155:8453");
      expect(normalizeNetwork("eip155:84532")).toBe("eip155:84532");
    });

    it("passes through CAIP-2 SVM networks", () => {
      expect(normalizeNetwork("solana:mainnet")).toBe("solana:mainnet");
    });

    it("maps the legacy v1 short form to canonical CAIP-2", () => {
      expect(normalizeNetwork("base")).toBe("eip155:8453");
      expect(normalizeNetwork("base-sepolia")).toBe("eip155:84532");
      expect(normalizeNetwork("ethereum-sepolia")).toBe("eip155:11155111");
      expect(normalizeNetwork("solana")).toBe("solana:mainnet");
      expect(normalizeNetwork("solana-devnet")).toBe("solana:devnet");
    });

    it("forwards unknown CAIP-shaped strings", () => {
      expect(normalizeNetwork("cosmos:cosmoshub-4")).toBe("cosmos:cosmoshub-4");
    });

    it("throws SpendControlError on garbage", () => {
      expect(() => normalizeNetwork("not a network")).toThrow(SpendControlError);
    });
  });

  describe("normalizePayee", () => {
    it("lower-cases EVM payees regardless of CAIP vs legacy network", () => {
      const checksummed = "0xAbCdEf1234567890aBcdEf1234567890ABCDEF12";
      expect(normalizePayee("eip155:8453", checksummed)).toBe(checksummed.toLowerCase());
      expect(normalizePayee("base-sepolia", checksummed)).toBe(checksummed.toLowerCase());
    });

    it("preserves SVM payee case", () => {
      const svm = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu";
      expect(normalizePayee("solana:mainnet", svm)).toBe(svm);
      expect(normalizePayee("solana-devnet", svm)).toBe(svm);
    });

    it("trims whitespace on both sides", () => {
      expect(normalizePayee("eip155:8453", "  0xAbCd  ")).toBe("0xabcd");
    });

    it("falls back to passthrough on unknown chain families", () => {
      expect(normalizePayee("cosmos:cosmoshub-4", "FoO ")).toBe("FoO");
    });
  });

  describe("normalizeAsset", () => {
    it("lower-cases EVM contract addresses", () => {
      const addr = "0x036cBD53842c5426634e7929541ec2318f3DCF7E";
      expect(normalizeAsset(addr)).toBe(addr.toLowerCase());
    });

    it("preserves SPL mint case", () => {
      const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      expect(normalizeAsset(mint)).toBe(mint);
    });

    it("preserves symbolic asset strings", () => {
      expect(normalizeAsset("USDC")).toBe("USDC");
    });
  });
});
