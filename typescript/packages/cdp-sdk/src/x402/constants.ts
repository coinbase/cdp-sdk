/** SDK metadata for correlation headers */
export const SDK_METADATA = {
  sdkLanguage: "typescript",
  source: "cdp-sdk",
  sourceVersion: "0.0.1",
} as const;

/** Request header carrying the encoded payment payload (v2 protocol). */
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE" as const;

/** Request header carrying the encoded payment payload (v1 protocol). */
export const X_PAYMENT_HEADER = "X-PAYMENT" as const;

/** Response header that may carry the encoded settlement result (v2). */
export const X_PAYMENT_RESPONSE_HEADER = "X-PAYMENT-RESPONSE" as const;

/** Response header that may carry the encoded settlement result (v1). */
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE" as const;
