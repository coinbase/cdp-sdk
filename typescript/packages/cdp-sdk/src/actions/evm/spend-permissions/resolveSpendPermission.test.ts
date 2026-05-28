import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { resolveSpendPermission } from "./resolveSpendPermission.js";
import { UserInputValidationError } from "../../../errors.js";

import type { SpendPermissionInput } from "../../../client/evm/evm.types.js";

// Mock crypto.getRandomValues
const mockRandomValues = vi.fn();

describe("resolveSpendPermission", () => {
  beforeEach(() => {
    // Mock Date.now to return a consistent timestamp
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    // Mock crypto.getRandomValues to return predictable values
    mockRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    });

    // Mock the global crypto object
    vi.stubGlobal("crypto", {
      getRandomValues: mockRandomValues,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("period handling", () => {
    it("should use period when provided", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400, // 1 day in seconds
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.period).toBe(86400);
    });

    it("should convert periodInDays to seconds", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        periodInDays: 7, // 7 days
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.period).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    it("should throw error when both period and periodInDays are provided", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
        periodInDays: 1,
      };

      expect(() => resolveSpendPermission(input, "ethereum")).toThrow(UserInputValidationError);
      expect(() => resolveSpendPermission(input, "ethereum")).toThrow(
        "Cannot specify both 'period' and 'periodInDays'. Please provide only one.",
      );
    });

    it("should throw error when neither period nor periodInDays are provided", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
      };

      expect(() => resolveSpendPermission(input, "ethereum")).toThrow(UserInputValidationError);
      expect(() => resolveSpendPermission(input, "ethereum")).toThrow(
        "Must specify either 'period' (in seconds) or 'periodInDays'.",
      );
    });
  });

  describe("start and end defaults", () => {
    it("should default start to current time when not provided", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.start).toBe(1704067200); // Jan 1, 2024 00:00:00 UTC in seconds
    });

    it("should default end to max uint48 when not provided", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.end).toBe(281474976710655); // Max uint48 value
    });

    it("should use provided start and end Date values", () => {
      const startDate = new Date("2001-09-09T01:46:40.000Z"); // 1000000000 seconds
      const endDate = new Date("2033-05-18T03:33:20.000Z"); // 2000000000 seconds

      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
        start: startDate,
        end: endDate,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.start).toBe(1000000000);
      expect(result.end).toBe(2000000000);
    });
  });

  describe("salt generation", () => {
    it("should generate random salt when not provided", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.salt).toBeTypeOf("bigint");
      expect(result.salt).not.toBe(0n);
      expect(mockRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it("should use provided salt when given", () => {
      const customSalt = 12345n;
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
        salt: customSalt,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.salt).toBe(customSalt);
      expect(mockRandomValues).not.toHaveBeenCalled();
    });
  });

  describe("token resolution", () => {
    it("should resolve ETH token address", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.token).toBe("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
    });

    it("should resolve USDC token address on Base", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "usdc",
        allowance: 1000000n,
        period: 86400,
      };

      const result = resolveSpendPermission(input, "base");

      expect(result.token).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    });

    it("should pass through custom token address", () => {
      const customTokenAddress = "0xCustomTokenAddress123456789012345678901234";
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: customTokenAddress,
        allowance: 1000000n,
        period: 86400,
      };

      const result = resolveSpendPermission(input, "base");

      expect(result.token).toBe(customTokenAddress);
    });
  });

  describe("extraData handling", () => {
    it("should default extraData to '0x' when not provided", () => {
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.extraData).toBe("0x");
    });

    it("should use provided extraData", () => {
      const customExtraData = "0x1234";
      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "eth",
        allowance: 1000000000000000000n,
        period: 86400,
        extraData: customExtraData,
      };

      const result = resolveSpendPermission(input, "ethereum");

      expect(result.extraData).toBe(customExtraData);
    });
  });

  describe("complete transformation", () => {
    it("should transform SpendPermissionInput to SpendPermission with all required fields", () => {
      const startDate = new Date("2001-09-09T01:46:40.000Z"); // 1000000000 seconds
      const endDate = new Date("2033-05-18T03:33:20.000Z"); // 2000000000 seconds

      const input: SpendPermissionInput = {
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "usdc",
        allowance: 1000000n,
        periodInDays: 30,
        start: startDate,
        end: endDate,
        salt: 999n,
        extraData: "0xdeadbeef",
      };

      const result = resolveSpendPermission(input, "base");

      expect(result).toEqual({
        account: "0x1234567890123456789012345678901234567890",
        spender: "0x0987654321098765432109876543210987654321",
        token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
        allowance: 1000000n,
        period: 30 * 24 * 60 * 60, // 30 days in seconds
        start: 1000000000,
        end: 2000000000,
        salt: 999n,
        extraData: "0xdeadbeef",
      });
    });
  });
});
