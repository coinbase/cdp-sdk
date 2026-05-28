/** SDK metadata for correlation headers */
export const SDK_METADATA = {
  sdkLanguage: "typescript",
  source: "cdp-x402",
  sourceVersion: "0.0.1",
} as const;

/**
 * x402 protocol header names.
 *
 * Defined here so all layers (client wrapper, guardrails, HTTP utilities) share
 * a single source of truth and don't drift independently if the upstream
 * `@x402` packages evolve their header names.
 */

/** Request header carrying the encoded payment payload (v2 protocol). */
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE" as const;

/** Request header carrying the encoded payment payload (v1 protocol). */
export const X_PAYMENT_HEADER = "X-PAYMENT" as const;

/**
 * Response headers that may carry the encoded settlement result.
 * v2 prefers `X-PAYMENT-RESPONSE`; v1 uses `PAYMENT-RESPONSE`.
 * Both are checked so the client works regardless of the server's protocol version.
 */
export const X_PAYMENT_RESPONSE_HEADER = "X-PAYMENT-RESPONSE" as const;
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE" as const;
