import { describe, expect, it, vi } from "vitest";

import { applySpendControls, getSpendControlsRegistry } from "./apply.js";

import type { SchemeNetworkClient, x402Client as X402Client } from "@x402/core/client";
import type { PaymentRequired, PaymentRequirements } from "@x402/core/types";

import { x402Client } from "@x402/core/client";

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

const makeRequired = (amount: string): PaymentRequired =>
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
      },
    ],
  }) as PaymentRequired;

const totalFor = (resolved: ReturnType<typeof applySpendControls>, asset = USDC): Promise<bigint> =>
  resolved.tracker.total({ asset });

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

    // The same payload reference returned by createPaymentPayload is what
    // @x402/fetch passes back into onPaymentResponse — confirm must reconcile it.
    await client.handlePaymentResponse({
      paymentPayload: payload,
      requirements: payload.accepted as PaymentRequirements,
      settleResponse: { success: true } as never,
    });

    expect(await totalFor(resolved)).toBe(10_000n);
  });

  it("rolls back spend when settlement fails", async () => {
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

    expect(await totalFor(resolved)).toBe(0n);
  });

  it("rolls back spend when the server responds with a fresh paymentRequired (verify failed)", async () => {
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

    expect(await totalFor(resolved)).toBe(0n);
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

    const payload = await client.createPaymentPayload(makeRequired("10000"));
    expect(await totalFor(resolved)).toBe(10_000n);

    // Some transports (JSON round-trip, shallow spread, MCP tool wrappers) clone
    // the payload object before passing it back through onPaymentResponse.
    // The fingerprint fallback must still correctly reconcile the spend.
    await client.handlePaymentResponse({
      paymentPayload: { ...payload },
      requirements: payload.accepted as PaymentRequirements,
      settleResponse: { success: false } as never,
    });

    expect(await totalFor(resolved)).toBe(0n);
  });

  it("does not cross-reconcile two independent payments with different amounts", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: USDC },
    });

    // Two separate payments — different amounts produce different fingerprints,
    // so reconciling one must not accidentally affect the other.
    const payload1 = await client.createPaymentPayload(makeRequired("10000"));
    const payload2 = await client.createPaymentPayload(makeRequired("20000"));
    expect(await totalFor(resolved)).toBe(30_000n);

    // Roll back payment2 (via its clone). Payment1 must remain tracked.
    await client.handlePaymentResponse({
      paymentPayload: { ...payload2 },
      requirements: payload2.accepted as PaymentRequirements,
      settleResponse: { success: false } as never,
    });

    expect(await totalFor(resolved)).toBe(10_000n);

    // Confirm payment1. Final total should remain 10_000.
    await client.handlePaymentResponse({
      paymentPayload: payload1,
      requirements: payload1.accepted as PaymentRequirements,
      settleResponse: { success: true } as never,
    });

    expect(await totalFor(resolved)).toBe(10_000n);
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
