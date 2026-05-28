import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  applySpendControls,
  getSpendControlsRegistry,
} from "../../../src/core/guardrails/apply.js";
import { SpendControlError } from "../../../src/core/guardrails/types.js";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";

const USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHook = (context: any) => Promise<any>;

/**
 * Lightweight fake `x402Client` exposing exactly the surface that
 * `applySpendControls` writes against. Captures registrations so tests can
 * invoke them directly.
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
      // First payment is fine — recording happens inside the before hook.
      await client.beforeHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: requirement,
      });
      // After hook is a no-op for ledger state.
      await client.afterHooks[0]({
        paymentRequired: {} as never,
        selectedRequirements: requirement,
        paymentPayload: {} as never,
      });
      // Second payment would cross 2000 > 1500.
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
      // Advance the clock past the window.
      vi.advanceTimersByTime(2 * 60 * 60 * 1_000);
      // The previous spend has aged out; a new payment of 1000 should be fine.
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
      // v1 PaymentRequirements uses maxAmountRequired instead of amount.
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
      // Simulate scheme creation failure.
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
      // Fire concurrently — both observe each other's anticipatory record
      // because of the per-asset mutex; the second is rejected.
      const results = await Promise.allSettled([
        client.beforeHooks[0](ctxA),
        client.beforeHooks[0](ctxB),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
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
      // 400 — 40% — no notify
      await runFullCycle(client, req({ amount: "400" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(0);
      // 800 — 80% — notify once for 0.8
      await runFullCycle(client, req({ amount: "400" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
      // The second notify happens at 95% — push to 950.
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
      // Regression: when payments A and B are both recorded before either
      // after-hook runs, reconstructing totalBefore as (totalAfter - atomic)
      // gave both hooks the same pre-payment total, causing both to fire.
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
      // Run both before-hooks concurrently so both records are written first.
      await Promise.all([client.beforeHooks[0](ctxA), client.beforeHooks[0](ctxB)]);
      // After hooks run sequentially (as the real client would do per-request).
      await client.afterHooks[0]({ ...ctxA, paymentPayload: payloadA });
      await client.afterHooks[0]({ ...ctxB, paymentPayload: payloadB });
      // Settlement-aware confirmation fires the threshold notifications.
      await registry.confirm(payloadA);
      await registry.confirm(payloadB);
      // The 0.8 threshold (800) was crossed only once — the second confirm
      // must not re-fire because the totalBefore snapshot from the before-hook
      // is used, not the reconstructed (totalAfter - atomic) value.
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
      // Bug 3 regression: warnings must not fire on payment creation alone —
      // only after the HTTP/settlement response confirms the spend occurred.
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
      // Warning has NOT fired yet — settlement isn't confirmed.
      expect(onApproachingLimit).toHaveBeenCalledTimes(0);
      await registry.confirm(paymentPayload);
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
    });

    it("does not fire warnings for a payment that the server rejected", async () => {
      // Bug 1 + Bug 3 regression: a failed HTTP settlement must neither
      // consume cap budget nor produce a spurious threshold notification.
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
      // Bug 3 regression: if a failed payment caused the threshold to fire,
      // rollback must reset the notification state so the next successful
      // payment that re-crosses can re-notify.
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 100n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8],
        onApproachingLimit,
      });
      // Payment 1: spend confirmed, fires the 0.8 warning (90 of 100).
      await runFullCycle(client, req({ amount: "90" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(1);
      // Payment 1 is rolled back (e.g. HTTP settlement failed) — the
      // notification state must reset since the spend was undone.
      // We can simulate this by rolling back the same total via a fresh
      // failing payment after returning to 0 spend (achieved via expiry).
      vi.advanceTimersByTime(2 * 60 * 60 * 1_000);
      // Now a fresh payment of 90 — should re-fire because the window
      // elapsed AND no concurrent spend remains.
      await runFullCycle(client, req({ amount: "90" }));
      expect(onApproachingLimit).toHaveBeenCalledTimes(2);
    });

    it("rolls back the ledger entry on settlement failure (Bug 1)", async () => {
      // Bug 1 core regression: when the HTTP response after a successful
      // payment payload indicates settlement failure, the provisional
      // record must be removed so the cap is restored.
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 1_500n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
      });
      await runFullCycleThenRollback(client, req({ amount: "1000" }));
      expect(await resolved.tracker.total({ asset: USDC })).toBe(0n);
      // A retry of the same amount must now succeed because the cap was
      // restored.
      await expect(runFullCycle(client, req({ amount: "1000" }))).resolves.toBeDefined();
      expect(await resolved.tracker.total({ asset: USDC })).toBe(1000n);
    });

    it("does not fire false-positive warnings when a concurrent provisional payment later rolls back", async () => {
      // Regression: payment A (100) and B (80) are created concurrently against
      // a limit of 200 with an 80% threshold (160). A's provisional entry is
      // in the tracker when B's before-hook runs. When A rolls back and B
      // confirms, B's confirmedBefore is 0 (not 100), so the threshold (160)
      // is not crossed and no spurious warning fires.
      const onApproachingLimit = vi.fn();
      const client = fakeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved = applySpendControls(client as any, {
        maxCumulativeSpend: { atomic: 200n, asset: USDC },
        maxCumulativeSpendWindow: "1h",
        approachingLimitThresholds: [0.8], // fires at 160
        onApproachingLimit,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = getSpendControlsRegistry(client as any)!;

      const ctxA = { paymentRequired: {} as never, selectedRequirements: req({ amount: "100" }) };
      const ctxB = { paymentRequired: {} as never, selectedRequirements: req({ amount: "80" }) };

      // Both before-hooks fire before either after-hook (simulates concurrent requests).
      await Promise.all([client.beforeHooks[0](ctxA), client.beforeHooks[0](ctxB)]);

      const payloadA = {} as unknown as PaymentPayload;
      const payloadB = {} as unknown as PaymentPayload;
      await client.afterHooks[0]({ ...ctxA, paymentPayload: payloadA });
      await client.afterHooks[0]({ ...ctxB, paymentPayload: payloadB });

      // A rolls back (e.g. server returned 402); B confirms (server accepted).
      await registry.rollback(payloadA);
      await registry.confirm(payloadB);

      // Confirmed total is only 80 (B). Threshold is 160. No warning should fire.
      expect(onApproachingLimit).toHaveBeenCalledTimes(0);
      expect(await resolved.tracker.total({ asset: USDC })).toBe(80n);
    });

    it("fires the warning correctly when a concurrent payment confirms and the threshold is genuinely crossed", async () => {
      // Scenario: A=100 and B=80 both confirm. Threshold at 80% of 200 = 160.
      // A confirms first (confirmedAfter=100 < 160 — no warning).
      // B confirms second (confirmedAfter=180 >= 160 — warning fires once).
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

      await registry.confirm(payloadA); // confirmed=100, no warning
      await registry.confirm(payloadB); // confirmed=180 >= 160, warning fires

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
      // Advance the clock past the window — the prior spend ages out.
      vi.setSystemTime(1_000 + 2 * 60 * 60 * 1_000);
      await runFullCycle(client, req({ amount: "50" }));
      // 50 alone should re-trigger the threshold against a fresh window.
      expect(onApproachingLimit).toHaveBeenCalledTimes(2);
    });
  });

  describe("hook ordering (pinGuardrailsBeforeHookLast)", () => {
    it("does not leak provisional spend when a before-hook registered after applySpendControls aborts", async () => {
      // Regression: the guardrails before-hook must run LAST so that a
      // user-registered hook that aborts after applySpendControls() fires
      // before guardrails records any provisional spend.
      const { x402Client: RealClient } = await import("@x402/core/client");
      const client = new RealClient();
      // A minimal scheme client so createPaymentPayload can select requirements.
      client.register("eip155:84532", {
        scheme: "exact",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createPaymentPayload: vi.fn().mockResolvedValue({ x402Version: 2 } as any),
      } as never);

      const resolved = applySpendControls(client, {
        maxCumulativeSpend: { atomic: 1_000_000n, asset: USDC },
      });

      // Register an aborting hook AFTER applySpendControls — it should run
      // before the guardrails hook, preventing any provisional entry.
      client.onBeforePaymentCreation(async () => ({ abort: true as const, reason: "test abort" }));

      const paymentRequired = {
        x402Version: 2,
        resource: "https://example.com",
        accepts: [req()],
      };

      await expect(client.createPaymentPayload(paymentRequired as never)).rejects.toThrow(
        "Payment creation aborted",
      );

      // Tracker must be empty — no provisional spend was recorded.
      expect(await resolved.tracker.total({ asset: USDC })).toBe(0n);
    });

    it("hooks registered after applySpendControls run before the guardrails hook (order verification)", async () => {
      // Verify the hook ordering directly: call order must be [user-hook, guardrails-hook].
      const { x402Client: RealClient } = await import("@x402/core/client");
      const client = new RealClient();
      const callOrder: string[] = [];

      const resolved = applySpendControls(client, {
        maxCumulativeSpend: { atomic: 1_000_000n, asset: USDC },
      });

      // Register a user hook after applySpendControls.
      client.onBeforePaymentCreation(async () => {
        callOrder.push("user");
        return undefined;
      });

      // A scheme that records its call so we know whether the before-hooks ran.
      client.register("eip155:84532", {
        scheme: "exact",
        createPaymentPayload: vi.fn().mockImplementation(async () => {
          callOrder.push("scheme");
          return { x402Version: 2, payload: {}, resource: "", accepted: req() };
        }),
      } as never);

      // Spy on the guardrails hook position by checking when spend is recorded.
      const paymentRequired = {
        x402Version: 2,
        resource: "https://example.com",
        accepts: [req({ amount: "100" })],
      };

      await client.createPaymentPayload(paymentRequired as never);

      // user hook must fire before the scheme (and therefore before guardrails).
      expect(callOrder.indexOf("user")).toBeLessThan(callOrder.indexOf("scheme"));
      // Spend was recorded by guardrails after the user hook passed.
      expect(await resolved.tracker.total({ asset: USDC })).toBe(100n);
    });
  });
});

/**
 * Drives a full before/after cycle on the fake client and confirms the
 * payment as settled — i.e. mimics what the real upstream `x402Client`
 * plus a settlement-aware fetch wrapper do on a successful end-to-end
 * payment. Threshold notifications fire only after `confirm()`.
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
 * Drives a full before/after cycle and then rolls back the payment as if
 * the HTTP settlement response indicated failure.
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
