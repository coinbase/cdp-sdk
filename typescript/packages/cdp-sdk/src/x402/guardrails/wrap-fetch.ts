/*
 * Settlement-aware fetch wrapper for x402 payments.
 */
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { decodePaymentResponseHeader } from "@x402/core/http";

import { getSpendControlsRegistry, type SpendControlsRegistry } from "./apply.js";

import type { PaymentPayload, SettleResponse } from "@x402/core/types";

const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";
const X_PAYMENT_HEADER = "X-PAYMENT";
const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";
const X_PAYMENT_RESPONSE_HEADER = "X-PAYMENT-RESPONSE";
const PAYMENT_RESPONSE_HEADERS = [X_PAYMENT_RESPONSE_HEADER, PAYMENT_RESPONSE_HEADER];

type SettlementHeader = SettleResponse | null | undefined;

const readSettlementResponse = (response: Response): SettlementHeader => {
  for (const name of PAYMENT_RESPONSE_HEADERS) {
    const raw = response.headers.get(name);
    if (raw !== null) {
      if (raw === "") return null;
      try {
        return decodePaymentResponseHeader(raw);
      } catch {
        return null;
      }
    }
  }
  return undefined;
};

const isSettled = (response: Response, settle: SettlementHeader): boolean => {
  if (settle === null) return false;
  if (settle !== undefined) return settle.success === true;
  return response.ok;
};

const resolveRegistry = (
  client: x402Client | x402HTTPClient,
): SpendControlsRegistry | undefined => {
  const baseClient =
    client instanceof x402HTTPClient
      ? (client as unknown as { client: x402Client }).client
      : client;
  if (!baseClient) {
    // eslint-disable-next-line no-console
    console.warn(
      "[@coinbase/cdp-sdk/x402] wrapFetchWithPayment: could not access base x402Client; " +
        "spend controls will not be enforced.",
    );
    return undefined;
  }
  return getSpendControlsRegistry(baseClient);
};

/**
 * Wraps a fetch function to automatically pay for x402-protected APIs,
 * with settlement-aware spend tracking.
 *
 * Drop-in replacement for `wrapFetchWithPayment` from `@x402/fetch`. Confirms
 * or rolls back provisional spend records based on the server's settlement response.
 *
 * @param fetch - The fetch function to wrap (typically `globalThis.fetch`).
 * @param client - Configured `x402Client` or `x402HTTPClient`.
 * @returns A wrapped fetch function that handles 402 responses automatically.
 *
 * @example
 * ```typescript
 * import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
 *
 * const client = new CdpX402Client();
 * const fetchWithPayment = client.wrapFetch();
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

    const registry = resolveRegistry(client);

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
          // eslint-disable-next-line no-console
          console.warn("[@coinbase/cdp-sdk/x402] rollback error after encoding failure:", rbErr);
        }
      }
      throw e;
    }

    const secondResponse = await fetch(clonedRequest);

    if (registry) {
      const settlement = readSettlementResponse(secondResponse);
      try {
        if (isSettled(secondResponse, settlement)) {
          await registry.confirm(paymentPayload);
        } else {
          await registry.rollback(paymentPayload);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[@coinbase/cdp-sdk/x402] settlement finalization error:", e);
      }
    }

    return secondResponse;
  };
}
