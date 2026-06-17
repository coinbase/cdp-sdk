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

import { applySpendControls } from "./apply.js";
import { wrapFetchWithPayment } from "./wrap-fetch.js";

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
    const second = new Response(null, { status: 402 });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    const response = await fetchWithPayment("https://example.com/test");
    expect(response.status).toBe(402);
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });

  it("confirms the spend when the server returns a non-2xx status with success:true settlement header", async () => {
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
      headers: { "PAYMENT-RESPONSE": "" },
    });
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const fetchWithPayment = wrapFetchWithPayment(fetch as never, client);
    await fetchWithPayment("https://example.com/test");
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });

  it("rolls back provisional spend when header encoding throws before the paid request is sent", async () => {
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

    expect(await resolved.tracker.total({ asset: ASSET })).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// Shared-store provisional accounting
// ---------------------------------------------------------------------------

import type { SpendStore } from "./types.js";

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

  function paymentRequiredHeaderBase64Local(amount = "100000") {
    return Buffer.from(
      JSON.stringify({
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
      }),
    ).toString("base64");
  }

  function settledResponseHeaderLocal(success: boolean): string {
    const settle: SettleResponse = {
      success,
      transaction: "0xabc",
      network: NETWORK,
    };
    return encodePaymentResponseHeader(settle);
  }

  it("combines provisional totals from both clients so a rollback from one does not overcredit the threshold", async () => {
    const store = makeSharedStore();
    const { clientA, clientB, resolvedA } = makeClientPair(store, 200_000n);

    const firstA = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64Local() },
    });
    const secondA = new Response("paid", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeaderLocal(true) },
    });

    const firstB = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64Local() },
    });
    const secondB = new Response(null, { status: 402 });

    const fetchA = vi.fn().mockResolvedValueOnce(firstA).mockResolvedValueOnce(secondA);
    const fetchB = vi.fn().mockResolvedValueOnce(firstB).mockResolvedValueOnce(secondB);

    const wrapA = wrapFetchWithPayment(fetchA as never, clientA);
    const wrapB = wrapFetchWithPayment(fetchB as never, clientB);

    await Promise.all([wrapA("https://example.com/test"), wrapB("https://example.com/test")]);

    expect(await resolvedA.tracker.total({ asset: ASSET })).toBe(100_000n);
  });

  it("fires threshold notification exactly once after both in-flight payments confirm", async () => {
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
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64Local() },
    });
    const secondA = new Response("paid", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeaderLocal(true) },
    });
    const firstB = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64Local() },
    });
    const secondB = new Response("paid", {
      status: 200,
      headers: { "PAYMENT-RESPONSE": settledResponseHeaderLocal(true) },
    });

    const fetchA = vi.fn().mockResolvedValueOnce(firstA).mockResolvedValueOnce(secondA);
    const fetchB = vi.fn().mockResolvedValueOnce(firstB).mockResolvedValueOnce(secondB);

    const wrapA = wrapFetchWithPayment(fetchA as never, clientA);
    const wrapB = wrapFetchWithPayment(fetchB as never, clientB);

    await wrapA("https://example.com/test");
    await wrapB("https://example.com/test");

    expect(onApproachingLimit).toHaveBeenCalledTimes(1);
  });

  it("does not fire a false-positive threshold notification when the in-flight sibling later rolls back", async () => {
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
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64Local() },
    });
    const firstB = new Response(null, {
      status: 402,
      headers: { "PAYMENT-REQUIRED": paymentRequiredHeaderBase64Local("90000") },
    });
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
