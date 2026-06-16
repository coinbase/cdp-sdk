import { describe, it, expect } from "vitest";

import {
  parseAmount,
  parseDuration,
  SpendControlError,
  SpendControlErrorCodes,
} from "./types.js";

describe("guardrails/types", () => {
  describe("parseAmount", () => {
    it("accepts a bigint and preserves the optional asset arg", () => {
      expect(parseAmount(100n, "usdc")).toEqual({ atomic: 100n, asset: "usdc" });
    });

    it("accepts a decimal-integer string", () => {
      expect(parseAmount("250000")).toEqual({ atomic: 250_000n, asset: undefined });
    });

    it("accepts the <asset>:<atomic> shorthand and prefers it for the asset", () => {
      expect(parseAmount("USDC:100000")).toEqual({ atomic: 100_000n, asset: "USDC" });
    });

    it("explicit asset override wins over a shorthand asset", () => {
      expect(parseAmount("USDC:100000", "usd-base")).toEqual({
        atomic: 100_000n,
        asset: "usd-base",
      });
    });

    it("accepts an object form with explicit atomic", () => {
      expect(parseAmount({ atomic: "9000", asset: "usdc" })).toEqual({
        atomic: 9_000n,
        asset: "usdc",
      });
    });

    it("throws SpendControlError on a negative bigint", () => {
      const fn = (): unknown => parseAmount(-1n);
      expect(fn).toThrow(SpendControlError);
      expect(fn).toThrow(/non-negative/);
    });

    it("throws SpendControlError on garbage strings", () => {
      const fn = (): unknown => parseAmount("not-a-number");
      expect(fn).toThrow(SpendControlError);
    });

    it("throws SpendControlError on empty strings", () => {
      const fn = (): unknown => parseAmount("");
      expect(fn).toThrow(SpendControlError);
    });

    it("the thrown error carries code 'amount_unparseable'", () => {
      try {
        parseAmount("nope");
        throw new Error("expected to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(SpendControlError);
        expect((err as SpendControlError).code).toBe("amount_unparseable");
      }
    });
  });

  describe("parseDuration", () => {
    it("passes through positive numbers as ms", () => {
      expect(parseDuration(500)).toBe(500);
      expect(parseDuration(0)).toBe(0);
    });

    it("parses ms / s / m / h / d shorthand", () => {
      expect(parseDuration("500ms")).toBe(500);
      expect(parseDuration("30s")).toBe(30_000);
      expect(parseDuration("5m")).toBe(5 * 60_000);
      expect(parseDuration("1h")).toBe(3_600_000);
      expect(parseDuration("24h")).toBe(24 * 3_600_000);
      expect(parseDuration("7d")).toBe(7 * 24 * 3_600_000);
    });

    it("is case-insensitive on the unit", () => {
      expect(parseDuration("30S")).toBe(30_000);
    });

    it("rejects negative numbers", () => {
      expect(() => parseDuration(-1)).toThrow(SpendControlError);
    });

    it("rejects unsupported strings", () => {
      expect(() => parseDuration("3 hours")).toThrow(SpendControlError);
      expect(() => parseDuration("PT1H")).toThrow(SpendControlError);
    });
  });

  describe("SpendControlError", () => {
    it("preserves code and details", () => {
      const err = new SpendControlError("per_payment_cap", "boom", {
        attempted: "5",
        limit: "1",
      });
      expect(err.code).toBe("per_payment_cap");
      expect(err.details).toEqual({ attempted: "5", limit: "1" });
      expect(err.name).toBe("SpendControlError");
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(SpendControlError);
    });

    it("defaults details to an empty object", () => {
      const err = new SpendControlError("payee_not_allowed", "nope");
      expect(err.details).toEqual({});
    });
  });

  describe("SpendControlErrorCodes", () => {
    it("exposes every error code as a typed string constant", () => {
      expect(SpendControlErrorCodes).toEqual({
        PER_PAYMENT_CAP: "per_payment_cap",
        CUMULATIVE_CAP: "cumulative_cap",
        ALREADY_APPLIED: "already_applied",
        CONFIGURATION_INVALID: "configuration_invalid",
        LEDGER_CAPACITY_EXCEEDED: "ledger_capacity_exceeded",
        NETWORK_NOT_ALLOWED: "network_not_allowed",
        ASSET_NOT_ALLOWED: "asset_not_allowed",
        PAYEE_NOT_ALLOWED: "payee_not_allowed",
        AMOUNT_UNPARSEABLE: "amount_unparseable",
      });
    });

    it("constants match the codes stored on SpendControlError instances", () => {
      const err = new SpendControlError(SpendControlErrorCodes.CUMULATIVE_CAP, "boom");
      expect(err.code).toBe(SpendControlErrorCodes.CUMULATIVE_CAP);
      expect(err.code).toBe("cumulative_cap");
    });
  });
});
