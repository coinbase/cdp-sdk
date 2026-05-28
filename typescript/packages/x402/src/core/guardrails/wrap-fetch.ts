/**
 * Settlement-aware replacement for `wrapFetchWithPayment` from `@x402/fetch`.
 *
 * The upstream wrapper records spend the moment the payment payload is
 * created — before the second HTTP request runs. That means a server 402
 * after a successful payload (e.g. facilitator `verify` failed) still
 * consumes cap budget even though nothing actually settled on-chain,
 * leaving the client unable to retry.
 *
 * This wrapper inspects the response from the second request:
 *
 * - If the server returns a payment-response header decoding to a
 *   `SettleResponse` with `success: true`, the provisional spend is
 *   **confirmed** — threshold notifications fire and the ledger entry
 *   remains in place.
 * - If the response is non-2xx, omits a payment-response header on a
 *   non-2xx response, or the header decodes to `success: false`, the
 *   provisional spend is **rolled back** — the ledger entry is removed
 *   and any threshold notifications it caused to fire are un-marked so
 *   a successful retry can re-notify.
 * - If a payment-response header is present but cannot be decoded, the
 *   provisional spend is **rolled back** — a malformed header is not
 *   trusted as proof of settlement.
 * - If a network error occurs after the paid request was sent, the
 *   provisional spend is **kept** so the cap fails closed; the server
 *   may have settled on-chain even though the client lost the response,
 *   and the caller can reconcile or retry explicitly.
 *
 * If the client has no spend controls applied (i.e. `applySpendControls`
 * was never called for it), this wrapper degrades transparently to the
 * upstream behavior.
 *
 * @packageDocumentation
 */
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { decodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentPayload, SettleResponse } from "@x402/core/types";

import {
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  X_PAYMENT_HEADER,
  X_PAYMENT_RESPONSE_HEADER,
} from "../constants.js";
import { getSpendControlsRegistry, type SpendControlsRegistry } from "./apply.js";

/**
 * Header names the server may use to return the encoded settlement response,
 * ordered by preference (v2 first, v1 fallback).
 */
const PAYMENT_RESPONSE_HEADERS = [X_PAYMENT_RESPONSE_HEADER, PAYMENT_RESPONSE_HEADER];

/**
 * Result of inspecting the payment-response header on a response:
 * - `undefined`: no header present at all.
 * - `null`: header present but failed to decode.
 * - `SettleResponse`: header present and decoded successfully.
 */
type SettlementHeader = SettleResponse | null | undefined;

/**
 * Returns the parsed {@link SettleResponse} from a response when the header
 * is present and decodes cleanly. Returns `null` when a header is present
 * but cannot be decoded (treated as a settlement failure), and `undefined`
 * when no header is present at all (allows legacy 2xx + no-header servers
 * to be trusted via the status code).
 */
function readSettlementResponse(response: Response): SettlementHeader {
  for (const name of PAYMENT_RESPONSE_HEADERS) {
    const raw = response.headers.get(name);
    if (raw !== null) {
      if (raw === "") return null; // empty header is not valid proof of settlement
      try {
        return decodePaymentResponseHeader(raw);
      } catch {
        return null;
      }
    }
  }
  return undefined;
}

/**
 * A response is treated as a successful settlement when:
 *
 * - A decoded `SettleResponse` header is present: its `success` field is
 *   the authoritative verdict, regardless of HTTP status. This covers the
 *   case where the server confirms on-chain settlement but returns a non-2xx
 *   application error for the resource itself.
 * - A malformed header (`null`) is *not* treated as success — without a
 *   valid header we have no proof of on-chain settlement.
 * - No header at all: fall back to the HTTP status code. This preserves
 *   compatibility with legacy servers that return 200 without the header.
 */
function isSettled(response: Response, settle: SettlementHeader): boolean {
  if (settle === null) return false; // malformed header — no proof of settlement
  if (settle !== undefined) return settle.success === true; // header is authoritative
  return response.ok; // no header — trust HTTP status (legacy)
}

/**
 * Resolve the {@link SpendControlsRegistry} from a client, reaching through
 * `x402HTTPClient` to the underlying `x402Client` when necessary.
 */
function resolveRegistry(client: x402Client | x402HTTPClient): SpendControlsRegistry | undefined {
  const baseClient =
    client instanceof x402HTTPClient
      ? (client as unknown as { client: x402Client }).client
      : client;
  if (!baseClient) {
    console.warn(
      "[@coinbase/x402] wrapFetchWithPayment: could not access base x402Client; " +
        "spend controls will not be enforced.",
    );
    return undefined;
  }
  return getSpendControlsRegistry(baseClient);
}

/**
 * Enables the payment of APIs using the x402 payment protocol with
 * settlement-aware spend tracking.
 *
 * Drop-in replacement for `wrapFetchWithPayment` from `@x402/fetch`. Behaves
 * identically except that it consults the {@link SpendControlsRegistry}
 * attached to the client by `applySpendControls` and confirms or rolls
 * back the provisional spend record after the HTTP settlement response is
 * known.
 *
 * @param fetch - The fetch function to wrap (typically `globalThis.fetch`).
 * @param client - Configured `x402Client` or `x402HTTPClient`. When the
 *   client has spend controls applied, failed settlements (HTTP 4xx/5xx or
 *   `SettleResponse.success: false`) will roll back the provisional spend
 *   record so a retry succeeds.
 * @returns A wrapped fetch function that handles 402 responses
 *   automatically.
 *
 * @example
 * ```typescript
 * import { CdpX402Client, wrapFetchWithPayment, applySpendControls } from "@coinbase/x402";
 *
 * const client = new CdpX402Client();
 * applySpendControls(client, { maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC } });
 * const fetchWithPayment = wrapFetchWithPayment(fetch, client);
 * const response = await fetchWithPayment("https://api.example.com/paid");
 * ```
 */
export function wrapFetchWithPayment(
  fetch: typeof globalThis.fetch,
  client: x402Client | x402HTTPClient,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const httpClient = client instanceof x402HTTPClient ? client : new x402HTTPClient(client);

  return async (input, init) => {
    const request = new Request(input, init);
    const clonedRequest = request.clone();
    const response = await fetch(request);
    if (response.status !== 402) {
      return response;
    }

    if (
      clonedRequest.headers.has(PAYMENT_SIGNATURE_HEADER) ||
      clonedRequest.headers.has(X_PAYMENT_HEADER)
    ) {
      throw new Error("Payment already attempted");
    }

    let paymentRequired;
    try {
      const getHeader = (name: string) => response.headers.get(name);
      let body: unknown;
      try {
        const responseText = await response.text();
        if (responseText) body = JSON.parse(responseText);
      } catch {
        // Some servers omit the body entirely.
      }
      paymentRequired = httpClient.getPaymentRequiredResponse(getHeader, body);
    } catch (error) {
      throw new Error(
        `Failed to parse payment requirements: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    const hookHeaders = await httpClient.handlePaymentRequired(paymentRequired);
    if (hookHeaders) {
      const hookRequest = clonedRequest.clone();
      for (const [key, value] of Object.entries(hookHeaders)) {
        hookRequest.headers.set(key, value);
      }
      const hookResponse = await fetch(hookRequest);
      if (hookResponse.status !== 402) {
        return hookResponse;
      }
    }

    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = await client.createPaymentPayload(paymentRequired);
    } catch (error) {
      throw new Error(
        `Failed to create payment payload: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    // Resolve the registry only after `createPaymentPayload` has run so it
    // sees a registry attached by lazy initialization (e.g. `CdpX402Client`
    // applying spend controls on first use).
    const registry = resolveRegistry(client);

    // Wrap header encoding + request mutation so any error here still rolls
    // back the provisional ledger entry. Without this guard, a throw inside
    // encodePaymentSignatureHeader would leave an orphaned pending entry that
    // the caller cannot roll back (they never receive the payload reference).
    try {
      const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
      for (const [key, value] of Object.entries(paymentHeaders)) {
        clonedRequest.headers.set(key, value);
      }
      clonedRequest.headers.set(
        "Access-Control-Expose-Headers",
        `${PAYMENT_RESPONSE_HEADER},${X_PAYMENT_RESPONSE_HEADER}`,
      );
    } catch (e) {
      if (registry) {
        try {
          await registry.rollback(paymentPayload);
        } catch (rbErr) {
          console.warn("[@coinbase/x402] rollback error after encoding failure:", rbErr);
        }
      }
      throw e;
    }

    let secondResponse: Response;
    try {
      secondResponse = await fetch(clonedRequest);
    } catch (e) {
      // The paid request was sent but the response was lost. The server may
      // have settled on-chain, so keep the provisional ledger entry and let
      // the cap fail closed until the caller reconciles or retries.
      throw e;
    }

    if (registry) {
      const settlement = readSettlementResponse(secondResponse);
      try {
        if (isSettled(secondResponse, settlement)) {
          await registry.confirm(paymentPayload);
        } else {
          await registry.rollback(paymentPayload);
        }
      } catch (e) {
        console.warn("[@coinbase/x402] settlement finalization error:", e);
      }
    }

    return secondResponse;
  };
}
