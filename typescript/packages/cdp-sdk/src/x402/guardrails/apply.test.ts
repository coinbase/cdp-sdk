import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { applySpendControls, getSpendControlsRegistry } from "./apply.js";
import { SpendControlError } from "./types.js";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";

const USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHook = (context: any) => Promise<any>;

/**
 * Lightweight fake `x402Client` exposing exactly the surface that
 * `applySpendControls` writes against.
 */
function fakeClient() {
  const policies: Array<(v: number, r: PaymentRequirements[]) => PaymentRequirements[]> = [];
  const beforeHooks: AnyHook[] = [];
  const afterHooks: AnyHook[] = [];
  const failureHooks: AnyHook[] = [];
  return {
    registerPolicy(p: (v: number, r: PaymentRequirements[]) => PaymentRequirements[]) {
      policies.push(p);
      return this;
    },
    onBeforePaymentCreation(h: AnyHook) {
      beforeHooks.push(h);
      return this;
    },
    onAfterPaymentCreation(h: AnyHook) {
      afterHooks.push(h);
      return this;
    },
    onPaymentCreationFailure(h: AnyHook) {
      failureHooks.push(h);
      return this;
    },
    policies,
    beforeHooks,
    afterHooks,
    failureHooks,
  };
}

function req(overrides: Partial<PaymentRequirements> = {}): PaymentRequirements {
  return {
    scheme: "exact",
    network: "eip155:84532",
    asset: USDC,
    amount: "1000000",
    payTo: "0x1111111111111111111111111111111111111111",
    maxTimeoutSeconds: 60,
    extra: {},
    ...overrides,
  };
}

describe("guardrails/apply", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers exactly one policy and one before/after/failure hook", () => {
    const client = fakeClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applySpendControls(client as any, {
      maxAmountPerPayment: { atomic: 100n, asset: USDC },
    });
    expect(client.policies).toHaveLength(1);
    expect(client.beforeHooks).toHaveLength(1);
    expect(client.afterHooks).toHaveLength(1);
    expect(client.failureHooks).toHaveLength(1);
  });

  it("returns a frozen ResolvedSpendControls view", () => {
    const client = fakeClient();
    const resolved = applySpendControls(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      { maxCumulativeSpendWindow: "1h" },
    );
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(resolved.maxCumulativeSpendWindowMs).toBe(3_600_000);
  });

  it("rejects a second applySpendControls() on the same client", () => {
    const client = fakeClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applySpendControls(client as any, {});
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {}),
    ).toThrowError(
      expect.objectContaining({
        code: "already_applied",
      }),
    );
  });

  it("normalizes EVM payees in the resolved allowedPayees view", () => {
    const client = fakeClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved = applySpendControls(client as any, {
      allowedPayees: [" 0xABCDEF1234567890ABCDEF1234567890ABCDEF12 "],
    });
    expect(resolved.allowedPayees).toEqual(new Set(["0xabcdef1234567890abcdef1234567890abcdef12"]));
  });

  it("allows re-applying after an invalid config throw", () => {
    const client = fakeClient();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, { maxCumulativeSpend: { atomic: 100n } }),
    ).toThrow(/asset/);
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {}),
    ).not.toThrow();
  });

  it("rejects an asset-less maxCumulativeSpend at apply time", () => {
    const client = fakeClient();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n },
      }),
    ).toThrow(/asset/);
  });

  describe("policy filter (allowedNetworks / allowedAssets / allowedPayees)", () => {
    it("filters out requirements whose network is not allow-listed (CAIP)", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, { allowedNetworks: ["eip155:84532"] });
      const all = [req({ network: "eip155:8453" }), req({ network: "eip155:84532" })];
      expect(client.policies[0](2, all)).toEqual([all[1]]);
    });

    it("normalizes legacy v1 short forms in the allow-list", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, { allowedNetworks: ["base-sepolia"] });
      const all = [req({ network: "eip155:84532" })];
      expect(client.policies[0](2, all)).toEqual(all);
    });

    it("filters by EVM payee allow-list case-insensitively", () => {
      const client = fakeClient();
      const allowed = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, { allowedPayees: [allowed] });
      const accept = req({ payTo: allowed.toLowerCase() });
      const reject = req({ payTo: "0x9999999999999999999999999999999999999999" });
      expect(client.policies[0](2, [accept, reject])).toEqual([accept]);
    });

    it("filters by SVM payee allow-list case-sensitively", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        allowedPayees: ["7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"],
      });
      const ok = req({
        network: "solana:mainnet",
        payTo: "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu",
      });
      const wrongCase = req({
        network: "solana:mainnet",
        payTo: "7nyt1dv9qfmsqhczjbnya9jkhqovrplmkcffbjdqkbu",
      });
      expect(client.policies[0](2, [ok, wrongCase])).toEqual([ok]);
    });

    it("an empty allow-list means allow-all", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {});
      const all = [req(), req({ network: "eip155:8453" })];
      expect(client.policies[0](2, all)).toEqual(all);
    });

    it("throws payee_not_allowed (not network_not_allowed) when an off-network option masks an on-network payee block", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        allowedNetworks: ["eip155:84532"],
        allowedPayees: ["0xAAA0000000000000000000000000000000000000"],
      });
      const offNetwork = req({ network: "solana:mainnet", payTo: "doesNotMatter" });
      const onNetworkBadPayee = req({
        network: "eip155:84532",
        payTo: "0xBBB0000000000000000000000000000000000000",
      });
      let caught: unknown;
      try {
        client.policies[0](2, [offNetwork, onNetworkBadPayee]);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpendControlError);
      expect((caught as SpendControlError).code).toBe("payee_not_allowed");
    });

    it("throws asset_not_allowed (not network_not_allowed) when an off-network option masks an on-network asset block", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        allowedNetworks: ["eip155:84532"],
        allowedAssets: [USDC],
      });
      const offNetwork = req({ network: "solana:mainnet", asset: "SOL" });
      const onNetworkBadAsset = req({ network: "eip155:84532", asset: "0xdeadbeef" });
      let caught: unknown;
      try {
        client.policies[0](2, [offNetwork, onNetworkBadAsset]);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpendControlError);
      expect((caught as SpendControlError).code).toBe("asset_not_allowed");
    });

    it("prefers asset_not_allowed over payee_not_allowed when both occur on options that passed the network check", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        allowedNetworks: ["eip155:84532"],
        allowedAssets: [USDC],
        allowedPayees: ["0xAAA0000000000000000000000000000000000000"],
      });
      const badAsset = req({ network: "eip155:84532", asset: "0xdeadbeef" });
      const badPayee = req({
        network: "eip155:84532",
        payTo: "0xBBB0000000000000000000000000000000000000",
      });
      let caught: unknown;
      try {
        client.policies[0](2, [badAsset, badPayee]);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpendControlError);
      expect((caught as SpendControlError).code).toBe("asset_not_allowed");
    });

    it("still throws network_not_allowed when every option fails the network check", () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        allowedNetworks: ["eip155:84532"],
        allowedPayees: ["0xAAA0000000000000000000000000000000000000"],
      });
      let caught: unknown;
      try {
        client.policies[0](2, [
          req({ network: "eip155:8453" }),
          req({ network: "solana:mainnet" }),
        ]);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpendControlError);
      expect((caught as SpendControlError).code).toBe("network_not_allowed");
    });
  });

  describe("before-hook caps", () => {
    it("throws SpendControlError(per_payment_cap) when the requirement exceeds the cap", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxAmountPerPayment: { atomic: 999n },
      });
      let caught: unknown;
      try {
        await client.beforeHooks[0]({
          paymentRequired: {} as never,
          selectedRequirements: req({ amount: "1000" }),
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpendControlError);
      expect((caught as SpendControlError).code).toBe("per_payment_cap");
      expect((caught as SpendControlError).details).toMatchObject({
        attempted: "1000",
        limit: "999",
      });
    });

    it("does not throw when the cap is configured for a different asset", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxAmountPerPayment: { atomic: 1n, asset: "0xdeadbeef" },
      });
      const result = await client.beforeHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: req({ amount: "5000000" }),
      });
      expect(result).toBeUndefined();
    });

    it("throws SpendControlError(cumulative_cap) when the running total would exceed the cap", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_500n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
      });
      const requirement = req({ amount: "1000" });
      await client.beforeHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: requirement,
      });
      await client.afterHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: requirement,
        paymentPayload: {} as never,
      });
      let caught: unknown;
      try {
        await client.beforeHooks[0]({
          paymentRequired: {} as never,
          selectedRequirements: requirement,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpendControlError);
      expect((caught as SpendControlError).code).toBe("cumulative_cap");
    });

    it("does not count payments outside the rolling window", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_500n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
      });
      const requirement = req({ amount: "1000" });
      await client.beforeHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: requirement,
      });
      vi.advanceTimersByTime(2 * 60 * 60 * 1_000);
      const result = await client.beforeHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: requirement,
      });
      expect(result).toBeUndefined();
    });

    it("treats a zero-duration window as configured (not lifetime)", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_500n, asset: USDC },
        maxCumulativeSpendWindow: 0,
      });
      const requirement = req({ amount: "1000" });
      vi.setSystemTime(1_000);
      await client.beforeHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: requirement,
      });
      vi.setSystemTime(2_000);
      await expect(
        client.beforeHooks[0]({
          paymentRequired: {} as never,
          selectedRequirements: requirement,
        }),
      ).resolves.toBeUndefined();
    });

    it("rejects negative payment requirement amounts as unparseable", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxAmountPerPayment: { atomic: 1_000n },
      });
      await expect(
        client.beforeHooks[0]({
          paymentRequired: {} as never,
          selectedRequirements: req({ amount: "-1" }),
        }),
      ).rejects.toMatchObject({
        code: "amount_unparseable",
      });
    });

    it("reads maxAmountRequired for x402 v1 requirements (no amount field)", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxAmountPerPayment: { atomic: 500n },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v1Req = { ...req(), amount: undefined, maxAmountRequired: "1000" } as any;
      let caught: unknown;
      try {
        await client.beforeHooks[0]({ paymentRequired: {} as never, selectedRequirements: v1Req });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpendControlError);
      expect((caught as SpendControlError).code).toBe("per_payment_cap");
      expect((caught as SpendControlError).details).toMatchObject({
        attempted: "1000",
        limit: "500",
      });
    });

    it("does not throw amount_unparseable for a v1 requirement within the per-payment cap", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxAmountPerPayment: { atomic: 2_000n },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v1Req = { ...req(), amount: undefined, maxAmountRequired: "1000" } as any;
      const result = await client.beforeHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: v1Req,
      });
      expect(result).toBeUndefined();
    });

    it("rolls back the anticipatory record when the failure hook fires", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_500n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
      });
      const requirement = req({ amount: "1000" });
      const ctx = {
        paymentRequired: {} as never,
        selectedRequirements: requirement,
      };
      await client.beforeHooks[0](ctx);
      expect(await resolved.tracker.total({ asset: USDC })).toBe(1000n);
      await client.failureHooks[0]({
        ...ctx,
        error: new Error("transient"),
      });
      expect(await resolved.tracker.total({ asset: USDC })).toBe(0n);
    });

    it("serializes concurrent before-hook calls so the cap cannot be exceeded", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_500n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
      });
      const requirement = req({ amount: "1000" });
      const ctxA = { paymentRequired: {} as never, selectedRequirements: requirement };
      const ctxB = { paymentRequired: {} as never, selectedRequirements: requirement };
      const results = await Promise.allSettled([
        client.beforeHooks[0](ctxA),
        client.beforeHooks[0](ctxB),
      ]);
      const fulfilled = results.filter(r => r.status === "fulfilled");
      const rejected = results.filter(r => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(SpendControlError);
      expect(((rejected[0] as PromiseRejectedResult).reason as SpendControlError).code).toBe(
        "cumulative_cap",
      );
      expect(await resolved.tracker.total({ asset: USDC })).toBe(1000n);
    });

    it("a per-payment cap rejection surfaces SpendControlError fields via .details", () => {
      const err = new SpendControlError("per_payment_cap", "boom", { attempted: "5", limit: "1" });
      expect(err.details).toEqual({ attempted: "5", limit: "1" });
    });
  });

  describe("onApproachingLimit", () => {
    it("fires once per crossed threshold per window (edge-triggered)", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_000n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        onApproachingLimit,
      });
      await runFullCycle(client, req({ amount: "400" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(0);
      await runFullCycle(client, req({ amount: "400" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
      await runFullCycle(client, req({ amount: "150" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(2);
    });

    it("respects custom approachingLimitThresholds", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.5],
        onApproachingLimit,
      });
      await runFullCycle(client, req({ amount: "50" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
    });

    it("re-fires after the rolling window elapses", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_000n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        onApproachingLimit,
      });
      await runFullCycle(client, req({ amount: "950" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(2); // 0.8 and 0.95
      vi.advanceTimersByTime(2 * 60 * 60 * 1_000);
      await runFullCycle(client, req({ amount: "950" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(4);
    });

    it("a throwing notifier does not fail the after hook (best-effort)", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        onApproachingLimit: () => {
          throw new Error("notifier boom");
        },
      });
      await expect(runFullCycle(client, req({ amount: "90" }))).resolves.not.toThrow();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("onApproachingLimit"),
        expect.any(Error),
      );
      warn.mockRestore();
    });

    it("fires onApproachingLimit exactly once when two parallel payments both cross a threshold", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_000n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = getSpendControlsRegistry(client as any)!;
      const ctxA = { paymentRequired: {} as never, selectedRequirements: req({ amount: "400" }) };
      const ctxB = { paymentRequired: {} as never, selectedRequirements: req({ amount: "400" }) };
      const payloadA = {} as unknown as PaymentPayload;
      const payloadB = {} as unknown as PaymentPayload;
      await Promise.all([client.beforeHooks[0](ctxA), client.beforeHooks[0](ctxB)]);
      await client.afterHooks[0]({ ...ctxA, paymentPayload: payloadA });
      await client.afterHooks[0]({ ...ctxB, paymentPayload: payloadB });
      await registry.confirm(payloadA);
      await registry.confirm(payloadB);
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
    });

    it("does not re-notify if confirm is invoked twice for the same payload", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = getSpendControlsRegistry(client as any)!;
      const ctx = {
        paymentRequired: {} as never,
        selectedRequirements: req({ amount: "90" }),
      };
      await client.beforeHooks[0](ctx);
      const paymentPayload = {} as unknown as PaymentPayload;
      await client.afterHooks[0]({ ...ctx, paymentPayload });
      await registry.confirm(paymentPayload);
      await registry.confirm(paymentPayload);
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
    });

    it("does not fire warnings until the settlement is confirmed", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = getSpendControlsRegistry(client as any)!;
      const ctx = { paymentRequired: {} as never, selectedRequirements: req({ amount: "90" }) };
      await client.beforeHooks[0](ctx);
      const paymentPayload = {} as unknown as PaymentPayload;
      await client.afterHooks[0]({ ...ctx, paymentPayload });
      expect(onApproachingLimit).toHaveBeenCalledTimes(0);
      await registry.confirm(paymentPayload);
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
    });

    it("does not fire warnings for a payment that the server rejected", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      await runFullCycleThenRollback(client, req({ amount: "90" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(0);
      expect(await resolved.tracker.total({ asset: USDC })).toBe(0n);
    });

    it("re-fires the warning when a payment that previously triggered it is rolled back and a fresh payment re-crosses the threshold", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      await runFullCycle(client, req({ amount: "90" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(2 * 60 * 60 * 1_000);
      await runFullCycle(client, req({ amount: "90" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(2);
    });

    it("rolls back the ledger entry on settlement failure (Bug 1)", async () => {
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_500n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
      });
      await runFullCycleThenRollback(client, req({ amount: "1000" }));
      expect(await resolved.tracker.total({ asset: USDC })).toBe(0n);
      await expect(runFullCycle(client, req({ amount: "1000" }))).resolves.toBeDefined();
      expect(await resolved.tracker.total({ asset: USDC })).toBe(1000n);
    });

    it("does not fire false-positive warnings when a concurrent provisional payment later rolls back", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 200n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = getSpendControlsRegistry(client as any)!;

      const ctxA = { paymentRequired: {} as never, selectedRequirements: req({ amount: "100" }) };
      const ctxB = { paymentRequired: {} as never, selectedRequirements: req({ amount: "80" }) };

      await Promise.all([client.beforeHooks[0](ctxA), client.beforeHooks[0](ctxB)]);

      const payloadA = {} as unknown as PaymentPayload;
      const payloadB = {} as unknown as PaymentPayload;
      await client.afterHooks[0]({ ...ctxA, paymentPayload: payloadA });
      await client.afterHooks[0]({ ...ctxB, paymentPayload: payloadB });

      await registry.rollback(payloadA);
      await registry.confirm(payloadB);

      expect(onApproachingLimit).toHaveBeenCalledTimes(0);
      expect(await resolved.tracker.total({ asset: USDC })).toBe(80n);
    });

    it("fires the warning correctly when a concurrent payment confirms and the threshold is genuinely crossed", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 200n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = getSpendControlsRegistry(client as any)!;

      const ctxA = { paymentRequired: {} as never, selectedRequirements: req({ amount: "100" }) };
      const ctxB = { paymentRequired: {} as never, selectedRequirements: req({ amount: "80" }) };

      await Promise.all([client.beforeHooks[0](ctxA), client.beforeHooks[0](ctxB)]);

      const payloadA = {} as unknown as PaymentPayload;
      const payloadB = {} as unknown as PaymentPayload;
      await client.afterHooks[0]({ ...ctxA, paymentPayload: payloadA });
      await client.afterHooks[0]({ ...ctxB, paymentPayload: payloadB });

      await registry.confirm(payloadA);
      await registry.confirm(payloadB);

      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
      expect(await resolved.tracker.total({ asset: USDC })).toBe(180n);
    });

    it("uses system time for rolling-window checks", async () => {
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.5],
        onApproachingLimit,
      });
      vi.setSystemTime(1_000);
      await runFullCycle(client, req({ amount: "50" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
      vi.setSystemTime(1_000 + 2 * 60 * 60 * 1_000);
      await runFullCycle(client, req({ amount: "50" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(2);
    });
  });

  describe("hook ordering (pinGuardrailsBeforeHookLast)", () => {
    it("does not leak provisional spend when a before-hook registered after applySpendControls aborts", async () => {
      const { x402Client: RealClient } = await import("@x402/core/client");
      const client = new RealClient();
      client.register("eip155:84532", {
        scheme: "exact",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createPaymentPayload: vi.fn().mockResolvedValue({ x402Version: 2 } as any),
      } as never);

      const resolved = applySpendControls(client, {
        maxCumulativeSpend: { atomic: 1_000_000n, asset: USDC },
      });

      client.onBeforePaymentCreation(async () => ({ abort: true as const, reason: "test abort" }));

      const paymentRequired = {
        x402Version: 2,
        resource: "https://example.com",
        accepts: [req()],
      };

      await expect(client.createPaymentPayload(paymentRequired as never)).rejects.toThrow(
        "Payment creation aborted",
      );

      expect(await resolved.tracker.total({ asset: USDC })).toBe(0n);
    });

    it("hooks registered after applySpendControls run before the guardrails hook (order verification)", async () => {
      const { x402Client: RealClient } = await import("@x402/core/client");
      const client = new RealClient();
      const callOrder: string[] = [];

      const resolved = applySpendControls(client, {
        maxCumulativeSpend: { atomic: 1_000_000n, asset: USDC },
      });

      client.onBeforePaymentCreation(async () => {
        callOrder.push("user");
        return undefined;
      });

      client.register("eip155:84532", {
        scheme: "exact",
        createPaymentPayload: vi.fn().mockImplementation(async () => {
          callOrder.push("scheme");
          return { x402Version: 2, payload: {}, resource: "", accepted: req() };
        }),
      } as never);

      const paymentRequired = {
        x402Version: 2,
        resource: "https://example.com",
        accepts: [req({ amount: "100" })],
      };

      await client.createPaymentPayload(paymentRequired as never);

      expect(callOrder.indexOf("user")).toBeLessThan(callOrder.indexOf("scheme"));
      expect(await resolved.tracker.total({ asset: USDC })).toBe(100n);
    });
  });
});

/**
 * Drives a full before/after cycle and confirms the payment as settled.
 */
async function runFullCycle(
  client: ReturnType<typeof fakeClient>,
  requirement: PaymentRequirements,
): Promise<PaymentPayload> {
  const ctx = {
    paymentRequired: {} as never,
    selectedRequirements: requirement,
  };
  await client.beforeHooks[0](ctx);
  const paymentPayload = {} as unknown as PaymentPayload;
  await client.afterHooks[0]({ ...ctx, paymentPayload });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registry = getSpendControlsRegistry(client as any);
  if (registry) await registry.confirm(paymentPayload);
  return paymentPayload;
}

/**
 * Drives a full before/after cycle and then rolls back the payment.
 */
async function runFullCycleThenRollback(
  client: ReturnType<typeof fakeClient>,
  requirement: PaymentRequirements,
): Promise<void> {
  const ctx = {
    paymentRequired: {} as never,
    selectedRequirements: requirement,
  };
  await client.beforeHooks[0](ctx);
  const paymentPayload = {} as unknown as PaymentPayload;
  await client.afterHooks[0]({ ...ctx, paymentPayload });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registry = getSpendControlsRegistry(client as any);
  if (registry) await registry.rollback(paymentPayload);
}
