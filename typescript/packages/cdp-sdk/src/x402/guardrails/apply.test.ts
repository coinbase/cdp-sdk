import { x402Client } from "@x402/core/client";
import { describe, expect, it, vi } from "vitest";

import { applySpendControls, getSpendControlsRegistry } from "./apply.js";

import type { SchemeNetworkClient, x402Client as X402Client } from "@x402/core/client";
import type {
  PaymentRequired,
  PaymentRequirements,
  PaymentRequiredV1,
  PaymentRequirementsV1,
} from "@x402/core/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NETWORK = "eip155:84532";
const USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
const PAY_TO = "0x0000000000000000000000000000000000000001";

/**
 * Minimal exact scheme so a real `x402Client.createPaymentPayload` resolves to a
 * payload without any signing — the guardrail hooks fire around it exactly as
 * they do in production.
 */
const fakeExactScheme: SchemeNetworkClient = {
  scheme: "exact",
  createPaymentPayload: async () => ({
    x402Version: 2,
    payload: { signature: "0xsig" },
  }),
};

const makeClient = (): X402Client => {
  const client = new x402Client();
  client.register(NETWORK, fakeExactScheme);
  return client;
};

/**
 * Builds a v2 PaymentRequired. `spoofedMaxAmountRequired`, when set, adds a
 * v1-shaped `maxAmountRequired` field alongside the real `amount` field.
 *
 * @param amount - The real v2 atomic amount.
 * @param spoofedMaxAmountRequired - Optional spoofed v1-shaped field to add alongside it.
 * @returns A v2 PaymentRequired with one accepted requirement.
 */
const makeRequired = (amount: string, spoofedMaxAmountRequired?: string): PaymentRequired =>
  ({
    x402Version: 2,
    resource: { url: "https://example.com/report", mimeType: "application/json" },
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        asset: USDC,
        amount,
        payTo: PAY_TO,
        maxTimeoutSeconds: 300,
        extra: {},
        ...(spoofedMaxAmountRequired !== undefined
          ? { maxAmountRequired: spoofedMaxAmountRequired }
          : {}),
      },
    ],
  }) as PaymentRequired;

const totalFor = (resolved: ReturnType<typeof applySpendControls>, asset = USDC): Promise<bigint> =>
  resolved.tracker.total({ asset });

/**
 * v1 exact scheme mirroring `ExactEvmSchemeV1`: it signs `maxAmountRequired`
 * as the authorized value, exactly as the real client-side scheme does.
 */
const NETWORK_V1 = "base-sepolia";
const fakeExactSchemeV1: SchemeNetworkClient = {
  scheme: "exact",
  createPaymentPayload: async (_x402Version, req) => ({
    x402Version: 1,
    scheme: "exact",
    network: NETWORK_V1,
    payload: { signedValue: (req as unknown as PaymentRequirementsV1).maxAmountRequired },
  }),
};

const makeClientV1 = (): X402Client => {
  const client = new x402Client();
  client.registerV1(NETWORK_V1, fakeExactSchemeV1);
  return client;
};

/**
 * Builds a v1 PaymentRequired. `spoofedAmount`, when set, adds a v2-shaped
 * `amount` field alongside the real `maxAmountRequired` — the shape a
 * malicious server would send to exploit field-presence-based selection.
 *
 * @param maxAmountRequired - The real v1 atomic amount.
 * @param spoofedAmount - Optional spoofed v2-shaped field to add alongside it.
 * @returns A v1 PaymentRequired with one accepted requirement.
 */
const makeRequiredV1 = (maxAmountRequired: string, spoofedAmount?: string): PaymentRequiredV1 => ({
  x402Version: 1,
  accepts: [
    {
      scheme: "exact",
      network: NETWORK_V1,
      maxAmountRequired,
      resource: "https://example.com/report",
      description: "",
      mimeType: "application/json",
      outputSchema: {},
      payTo: PAY_TO,
      maxTimeoutSeconds: 300,
      asset: USDC,
      extra: {},
      ...(spoofedAmount !== undefined ? { amount: spoofedAmount } : {}),
    } as PaymentRequirementsV1,
  ],
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("applySpendControls settlement reconciliation", () => {
  it("keeps provisional spend once createPaymentPayload resolves", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });

    await client.createPaymentPayload(makeRequired("10000"));

    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("confirms spend on settlement success (same payload object flows through)", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });

    const payload = await client.createPaymentPayload(makeRequired("10000"));
    expect(await totalFor(resolved)).toBe(10_000n);

    /*
     * The same payload reference returned by createPaymentPayload is what
     * @x402/fetch passes back into onPaymentResponse — confirm must reconcile it.
     */
    await client.handlePaymentResponse({
      paymentPayload: payload,
      requirements: payload.accepted as PaymentRequirements,
      settleResponse: { success: true } as never,
    });

    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("keeps spend when settlement reports failure (already-transmitted authorization is redeemable regardless)", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });

    const payload = await client.createPaymentPayload(makeRequired("10000"));
    expect(await totalFor(resolved)).toBe(10_000n);

    await client.handlePaymentResponse({
      paymentPayload: payload,
      requirements: payload.accepted as PaymentRequirements,
      settleResponse: { success: false } as never,
    });

    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("keeps spend when the server responds with a fresh paymentRequired (self-reported, untrustworthy)", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });

    const payload = await client.createPaymentPayload(makeRequired("10000"));
    expect(await totalFor(resolved)).toBe(10_000n);

    await client.handlePaymentResponse({
      paymentPayload: payload,
      requirements: payload.accepted as PaymentRequirements,
      paymentRequired: makeRequired("10000"),
    });

    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("a malicious server cannot reset the cumulative ledger by repeatedly reporting settlement failure", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 25_000n, asset: USDC },
    });

    for (let i = 0; i < 2; i++) {
      const payload = await client.createPaymentPayload(makeRequired("10000"));
      await client.handlePaymentResponse({
        paymentPayload: payload,
        requirements: payload.accepted as PaymentRequirements,
        settleResponse: { success: false } as never,
      });
    }

    expect(await totalFor(resolved)).toBe(20_000n);
    await expect(client.createPaymentPayload(makeRequired("10000"))).rejects.toThrow(
      /cumulative_cap|exceeding cap/,
    );
  });

  it("keeps spend on an ambiguous response (no settlement header, no follow-up 402)", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });

    const payload = await client.createPaymentPayload(makeRequired("10000"));

    await client.handlePaymentResponse({
      paymentPayload: payload,
      requirements: payload.accepted as PaymentRequirements,
    });

    // Fail-closed for the budget: an unknown on-chain outcome keeps the spend.
    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("keeps spend on a transport/parse error after the payment was sent", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });

    const payload = await client.createPaymentPayload(makeRequired("10000"));

    await client.handlePaymentResponse({
      paymentPayload: payload,
      requirements: payload.accepted as PaymentRequirements,
      error: new Error("connection reset"),
    });

    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("reconciles spend when the payload object is cloned before the response hook fires", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });
    const registry = getSpendControlsRegistry(client)!;

    const payload = await client.createPaymentPayload(makeRequired("10000"));
    expect(await totalFor(resolved)).toBe(10_000n);

    /*
     * Some transports (JSON round-trip, shallow spread, MCP tool wrappers) clone
     * the payload object before passing it back to the registry. The fingerprint
     * fallback must still correctly reconcile the spend. Rollback is exercised
     * directly here (never via the untrusted settlement response) since it is
     * only safe for a payload the caller independently knows was never sent.
     */
    await registry.rollback({ ...payload });

    expect(await totalFor(resolved)).toBe(0n);
  });

  it("does not cross-reconcile two independent payments with different amounts", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });
    const registry = getSpendControlsRegistry(client)!;

    /*
     * Two separate payments — different amounts produce different fingerprints,
     * so reconciling one must not accidentally affect the other.
     */
    const payload1 = await client.createPaymentPayload(makeRequired("10000"));
    const payload2 = await client.createPaymentPayload(makeRequired("20000"));
    expect(await totalFor(resolved)).toBe(30_000n);

    // Roll back payment2 (via its clone). Payment1 must remain tracked.
    await registry.rollback({ ...payload2 });

    expect(await totalFor(resolved)).toBe(10_000n);

    // Confirm payment1. Final total should remain 10_000.
    await registry.confirm(payload1);

    expect(await totalFor(resolved)).toBe(10_000n);
  });
});

describe("applySpendControls field-precedence (spoofed amount/maxAmountRequired)", () => {
  it("caps a v1 payment on maxAmountRequired even when a spoofed low amount is present", async () => {
    const client = makeClientV1();
    applySpendControls(client, {
      maxAmountPerPayment: { atomic: 5_000n, asset: USDC },
    });

    // Real signed value (maxAmountRequired) exceeds the cap; spoofed `amount` is tiny.
    await expect(client.createPaymentPayload(makeRequiredV1("1000000", "1"))).rejects.toThrow(
      /per_payment_cap|exceeds per-payment cap/,
    );
  });

  it("tracks a v1 payment's spend by maxAmountRequired, not a spoofed amount", async () => {
    const client = makeClientV1();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 1_000_000n, asset: USDC },
    });

    await client.createPaymentPayload(makeRequiredV1("10000", "1"));

    // Ledger must reflect the value that will actually be signed/transmitted.
    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("caps a v2 payment on amount even when a spoofed low maxAmountRequired is present", async () => {
    const client = makeClient();
    applySpendControls(client, {
      maxAmountPerPayment: { atomic: 5_000n, asset: USDC },
    });

    // Real signed value (amount) exceeds the cap; spoofed `maxAmountRequired` is tiny.
    await expect(client.createPaymentPayload(makeRequired("1000000", "1"))).rejects.toThrow(
      /per_payment_cap|exceeds per-payment cap/,
    );
  });

  it("tracks and caps a legitimate v1 payment correctly (no spoofing)", async () => {
    const client = makeClientV1();
    const resolved = applySpendControls(client, {
      maxAmountPerPayment: { atomic: 20_000n, asset: USDC },
      maxCumulativeSpend: { atomic: 20_000n, asset: USDC },
    });

    await client.createPaymentPayload(makeRequiredV1("15000"));
    expect(await totalFor(resolved)).toBe(15_000n);

    await expect(client.createPaymentPayload(makeRequiredV1("10000"))).rejects.toThrow(
      /cumulative_cap|exceeding cap/,
    );
  });

  it("throws amount_unparseable for a v1 requirement with a negative maxAmountRequired", async () => {
    const client = makeClientV1();
    applySpendControls(client, {
      maxCumulativeSpend: { atomic: 1_000_000n, asset: USDC },
    });

    // The error message must reflect maxAmountRequired (the version-keyed field
    // that will actually be signed), not a spoofed or absent `amount`.
    await expect(client.createPaymentPayload(makeRequiredV1("-100"))).rejects.toMatchObject({
      code: "amount_unparseable",
      message: expect.stringContaining('"-100"'),
    });
  });
});

describe("@x402/core internal assumption", () => {
  /*
   * applySpendControls pins its spend-cap hook last by reaching into the client's
   * private `beforePaymentCreationHooks` array (see pinGuardrailsBeforeHookLast in
   * apply.ts). This test documents that assumption: if a future @x402/core version
   * renames or removes the field, this fails when the dependency is bumped, prompting
   * us to revisit the pinning logic (which otherwise degrades to a runtime warning).
   */
  it("x402Client exposes a beforePaymentCreationHooks array that onBeforePaymentCreation appends to", () => {
    const client = new x402Client();
    const hooks = (client as unknown as { beforePaymentCreationHooks?: unknown[] })
      .beforePaymentCreationHooks;

    expect(Array.isArray(hooks)).toBe(true);

    const before = (hooks as unknown[]).length;
    const hook = async (): Promise<undefined> => undefined;
    client.onBeforePaymentCreation(hook);

    expect((hooks as unknown[]).length).toBe(before + 1);
    expect((hooks as unknown[])[before]).toBe(hook);
  });
});

describe("applySpendControls onApproachingLimit", () => {
  it("fires the callback once a confirmed payment crosses a threshold", async () => {
    const client = makeClient();
    const onApproachingLimit = vi.fn();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 20_000n, asset: USDC },
      approachingLimitThresholds: [0.5],
      onApproachingLimit,
    });

    const payload = await client.createPaymentPayload(makeRequired("12000"));
    // Thresholds fire on confirmation, not provisionally.
    expect(onApproachingLimit).not.toHaveBeenCalled();

    await client.handlePaymentResponse({
      paymentPayload: payload,
      requirements: payload.accepted as PaymentRequirements,
      settleResponse: { success: true } as never,
    });

    expect(onApproachingLimit).toHaveBeenCalledTimes(1);
    const [spent, limit] = onApproachingLimit.mock.calls[0];
    expect(spent.atomic).toBe(12_000n);
    expect(limit.atomic).toBe(20_000n);
    expect(await totalFor(resolved)).toBe(12_000n);
  });
});
