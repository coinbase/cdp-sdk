import { describe, expect, it } from "vitest";
import { resolveTokenAddress } from "./utils.js";
import { UserInputValidationError } from "../errors.js";

describe("utils", () => {
  describe("resolveTokenAddress", () => {
    it("should resolve the token address for the given network", () => {
      expect(resolveTokenAddress("eth", "ethereum")).toBe(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      );
      expect(resolveTokenAddress("usdc", "base")).toBe(
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      );
      expect(resolveTokenAddress("usdc", "base-sepolia")).toBe(
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      );
    });

    it("should throw an error if automatic address lookup for token is not supported on the network", () => {
      expect(() => resolveTokenAddress("usdc", "arbitrum")).toThrow(UserInputValidationError);
    });
  });
});
