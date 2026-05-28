/**
 * Tests for the settlement-aware `wrapFetchWithPayment` wrapper.
 *
 * Covers the Bug 1 regression: a successful payment payload followed by a
 * non-2xx HTTP response or a `SettleResponse.success: false` must roll
 * back the provisional spend record so the cap is restored.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { x402Client } from "@x402/core/client";
import { encodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentRequirements, SettleResponse } from "@x402/core/types";

import { applySpendControls } from "../../../src/core/guardrails/apply.js";
import { wrapFetchWithPayment } from "../../../src/core/guardrails/wrap-fetch.js";

const NETWORK = "eip155:84532";
const ASSET = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

function fakeSchemeClient() {
  return {
    scheme: "exact",
    createPaymentPayload: vi
      .fn()
      .mockImplementation(async (x402Version: number, requirements: PaymentRequirements) => ({
        x402Version,
        payload: { stub: true },
        extensions: undefined,
        resource: "https://example.com/test" as never,
        accepted: requirements,
      })),
  };
}

function paymentRequiredHeaderJson(amount = "100000") {
  return JSON.stringify({
    x402Version: 2,
    error: "",
    resource: "https://example.com/test",
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        asset: ASSET,
        amount,
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ],
  });
}

function paymentRequiredHeaderBase64(amount = "100000") {
  return Buffer.from(paymentRequiredHeaderJson(amount)).toString("base64");
}

function settledResponseHeader(success: boolean): string {
  const settle: SettleResponse = {
    success,
    transaction: "0xabc",
    network: NETWORK,
  };
  return encodePaymentResponseHeader(settle);
}

describe("guardrails/wrap-fetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeClient() {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);
    return client;
  }

  it("returns the response unchanged when the first request is not 402", async () => {
    const client = makeClient();
    applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const fetch = vi.fn().mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    const response = await fetchWithPayment("https://example.com/test");
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("confirms the spend when the second response settles successfully", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const second = new Response("paid content", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeader(true) },
    });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    const response = await fetchWithPayment("https://example.com/test");
    expect(response.status).toBe(200);
    // Spend remains committed.
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(100_000n);
  });

  it("rolls back the spend when the server returns 402 after a successful payload (Bug 1)", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    // Server rejects with 402 again — e.g. facilitator verify failed.
    const second = new Response(null, { status: 402 });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    const response = await fetchWithPayment("https://example.com/test");
    expect(response.status).toBe(402);
    // Spend was rolled back because nothing settled on-chain.
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });

  it("confirms the spend when the server returns a non-2xx status with success:true settlement header", async () => {
    // The settlement header is the authoritative source of truth when present.
    // A server can confirm on-chain settlement while returning a non-2xx
    // application error (e.g. the payment was accepted but access is still
    // forbidden for another reason).
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const second = new Response("forbidden", {
      status: 403,
      headers: { "PAYMENT-RESPONSE": settledResponseHeader(true) },
    });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    const response = await fetchWithPayment("https://example.com/test");
    expect(response.status).toBe(403);
    // Spend must be committed because the settlement header confirms on-chain settlement.
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(100_000n);
  });

  it("rolls back the spend when SettleResponse.success is false", async () => {
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const second = new Response("oops", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeader(false) },
    });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await fetchWithPayment("https://example.com/test");
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });

  it("keeps the provisional spend on a network error after the payload is sent", async () => {
    // A network failure after the paid request was sent is ambiguous — the
    // server may have settled on-chain even though the client lost the
    // response. The cap must fail closed until the caller reconciles.
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new Error("ECONNRESET"));
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await expect(fetchWithPayment("https://example.com/test")).rejects.toThrow("ECONNRESET");
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(100_000n);
  });

  it("rolls back the spend when the payment-response header is malformed", async () => {
    // A 2xx with an undecodable header is not proof of on-chain settlement.
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const second = new Response("paid content", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": "this-is-not-valid-base64-or-json" },
    });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await fetchWithPayment("https://example.com/test");
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });

  it("treats a successful 2xx response with no payment-response header as a successful settlement", async () => {
    // Some legacy servers omit the header on success — trust the status code.
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const second = new Response("paid content", { status: 200 });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await fetchWithPayment("https://example.com/test");
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(100_000n);
  });

  it("works transparently when the client has no spend controls applied", async () => {
    const client = makeClient();
    // No applySpendControls — wrapper should behave like the upstream.
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const second = new Response("paid content", { status: 200 });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    const response = await fetchWithPayment("https://example.com/test");
    expect(response.status).toBe(200);
  });

  it("defers threshold warnings until settlement is confirmed (Bug 3)", async () => {
    const onApproachingLimit = vi.fn();
    const client = makeClient();
    applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
      approachingLimitThresholds: [0.8],
      onApproachingLimit,
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64("90000") },
    });
    // Server returns 402 again — payment did NOT settle. Warning must NOT fire.
    const second = new Response(null, { status: 402 });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await fetchWithPayment("https://example.com/test");
    expect(onApproachingLimit).toHaveBeenCalledTimes(0);
  });

  it("fires threshold warnings when settlement is confirmed (Bug 3)", async () => {
    const onApproachingLimit = vi.fn();
    const client = makeClient();
    applySpendControls(client, {
      maxCumulativeSpend: { atomic: 100_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
      approachingLimitThresholds: [0.8],
      onApproachingLimit,
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64("90000") },
    });
    const second = new Response("paid", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeader(true) },
    });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await fetchWithPayment("https://example.com/test");
    expect(onApproachingLimit).toHaveBeenCalledTimes(1);
  });

  it("rolls back the spend when the payment-response header is present but empty", async () => {
    // An empty header value is not valid proof of on-chain settlement and must
    // be treated the same as a malformed header — roll back the provisional spend.
    const client = makeClient();
    const resolved = applySpendControls(client, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });
    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    // Server returns 200 but with an empty PAYMENT-RESPONSE header.
    const second = new Response("paid content", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": "" },
    });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await fetchWithPayment("https://example.com/test");
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });

  it("rolls back provisional spend when header encoding throws before the paid request is sent", async () => {
    // Regression: after createPaymentPayload succeeds, a throw inside
    // encodePaymentSignatureHeader leaves an orphaned pending entry.
    // The wrapper must roll back so the cap is restored.
    const { x402Client: X402Client, x402HTTPClient } = await import("@x402/core/client");
    const throwingClient = new X402Client();
    throwingClient.register(NETWORK, fakeSchemeClient() as never);
    const resolved = applySpendControls(throwingClient, {
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });

    const first = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const mockFetch = vi.fn().mockResolvedValueOnce(first);

    // Patch the prototype so encoding always throws.
    const origEncode = x402HTTPClient.prototype.encodePaymentSignatureHeader;
    x402HTTPClient.prototype.encodePaymentSignatureHeader = () => {
      throw new Error("encoding failure");
    };
    try {
      const fetchWithPayment = wrapFetchWithPayment(mockFetch as never, throwingClient);
      await expect(fetchWithPayment("https://example.com/test")).rejects.toThrow(
        "encoding failure",
      );
    } finally {
      x402HTTPClient.prototype.encodePaymentSignatureHeader = origEncode;
    }

    // The provisional entry must be rolled back — tracker total is zero
    // and a fresh payment can proceed within the cap.
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// Shared-store provisional accounting (STORE_PROVISIONAL_ATOMIC)
// ---------------------------------------------------------------------------
//
// When two clients share the same SpendStore, their in-flight (provisional)
// amounts must be tracked together so that threshold notifications and cap
// checks subtract the combined in-flight total from the shared tracker total,
// not just one client's contribution.

import type { SpendStore } from "../../../src/core/guardrails/types.js";

function makeSharedStore(): SpendStore {
  const entries: Array<unknown> = [];
  return {
    async load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return entries as any;
    },
    async append(entry) {
      entries.push(entry);
    },
    async prune() {
      /* no-op */
    },
    async removeEntry(entry) {
      const idx = entries.lastIndexOf(entry);
      if (idx >= 0) entries.splice(idx, 1);
    },
  };
}

describe("guardrails/wrap-fetch — shared-store provisional accounting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeClientPair(store: SpendStore, capAtomic: bigint) {
    const clientA = new x402Client();
    const clientB = new x402Client();
    clientA.register(NETWORK, fakeSchemeClient() as never);
    clientB.register(NETWORK, fakeSchemeClient() as never);
    const controls = {
      maxCumulativeSpend: { atomic: capAtomic, asset: ASSET },
      maxCumulativeSpendWindow: "1h" as const,
      store,
    };
    const resolvedA = applySpendControls(clientA, controls);
    const resolvedB = applySpendControls(clientB, controls);
    return { clientA, clientB, resolvedA, resolvedB };
  }

  it("combines provisional totals from both clients so a rollback from one does not overcredit the threshold", async () => {
    // Cap is 200_000. Client A pays 100_000 (settles). Client B pays 100_000
    // (rolls back). The confirmed total after both settle should be 100_000.
    const store = makeSharedStore();
    const { clientA, clientB, resolvedA } = makeClientPair(store, 200_000n);

    const firstA = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const secondA = new Response("paid", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeader(true) },
    });

    const firstB = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    // Client B's server returns 402 → rollback.
    const secondB = new Response(null, { status: 402 });

    const fetchA = vi.fn().mockResolvedValueOnce(firstA).mockResolvedValueOnce(secondA);
    const fetchB = vi.fn().mockResolvedValueOnce(firstB).mockResolvedValueOnce(secondB);

    const wrapA = wrapFetchWithPayment(fetchA as never, clientA);
    const wrapB = wrapFetchWithPayment(fetchB as never, clientB);

    await Promise.all([wrapA("https://example.com/test"), wrapB("https://example.com/test")]);

    // Only client A's payment settled, so the shared tracker total is 100_000.
    expect(await resolvedA.tracker.total({ asset: ASSET })).toBe(100_000n);
  });

  it("fires threshold notification exactly once after both in-flight payments confirm", async () => {
    // Cap is 200_000; threshold at 80% (160_000). Client A and B each pay
    // 100_000. After A confirms, confirmed total is 100_000 (< threshold).
    // After B confirms, confirmed total is 200_000 (> threshold) → notify once.
    const onApproachingLimit = vi.fn();
    const store = makeSharedStore();

    const clientA = new x402Client();
    const clientB = new x402Client();
    clientA.register(NETWORK, fakeSchemeClient() as never);
    clientB.register(NETWORK, fakeSchemeClient() as never);
    const controls = {
      maxCumulativeSpend: { atomic: 200_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h" as const,
      approachingLimitThresholds: [0.8],
      onApproachingLimit,
      store,
    };
    applySpendControls(clientA, controls);
    applySpendControls(clientB, controls);

    const firstA = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const secondA = new Response("paid", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeader(true) },
    });
    const firstB = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const secondB = new Response("paid", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeader(true) },
    });

    const fetchA = vi.fn().mockResolvedValueOnce(firstA).mockResolvedValueOnce(secondA);
    const fetchB = vi.fn().mockResolvedValueOnce(firstB).mockResolvedValueOnce(secondB);

    const wrapA = wrapFetchWithPayment(fetchA as never, clientA);
    const wrapB = wrapFetchWithPayment(fetchB as never, clientB);

    // Run sequentially to get deterministic threshold crossing.
    await wrapA("https://example.com/test");
    await wrapB("https://example.com/test");

    // The 80% threshold (160_000) is crossed exactly once (after second confirm).
    expect(onApproachingLimit).toHaveBeenCalledTimes(1);
  });

  it("does not fire a false-positive threshold notification when the in-flight sibling later rolls back", async () => {
    // Cap is 200_000; threshold at 80% (160_000). Client A pays 100_000 and
    // is in-flight. Client B pays 90_000 and is in-flight. While both are
    // provisional the tracker total is 190_000, but the *confirmed* total is
    // still 0 (neither settled yet). No notification should fire during the
    // provisional window, and none should fire after both roll back.
    const onApproachingLimit = vi.fn();
    const store = makeSharedStore();

    const clientA = new x402Client();
    const clientB = new x402Client();
    clientA.register(NETWORK, fakeSchemeClient() as never);
    clientB.register(NETWORK, fakeSchemeClient() as never);
    const controls = {
      maxCumulativeSpend: { atomic: 200_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h" as const,
      approachingLimitThresholds: [0.8],
      onApproachingLimit,
      store,
    };
    applySpendControls(clientA, controls);
    applySpendControls(clientB, controls);

    const firstA = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64() },
    });
    const firstB = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64("90000") },
    });
    // Both roll back.
    const secondA = new Response(null, { status: 402 });
    const secondB = new Response(null, { status: 402 });

    const fetchA = vi.fn().mockResolvedValueOnce(firstA).mockResolvedValueOnce(secondA);
    const fetchB = vi.fn().mockResolvedValueOnce(firstB).mockResolvedValueOnce(secondB);

    const wrapA = wrapFetchWithPayment(fetchA as never, clientA);
    const wrapB = wrapFetchWithPayment(fetchB as never, clientB);

    await Promise.all([wrapA("https://example.com/test"), wrapB("https://example.com/test")]);

    expect(onApproachingLimit).not.toHaveBeenCalled();
  });
});
