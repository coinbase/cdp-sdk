import { describe, expect, it } from "vitest";

import { selectPaymentRequirements } from "./selectPaymentRequirements.js";

import type { PaymentRequired } from "@x402/core/types";

function makePaymentRequired(accepts: PaymentRequired["accepts"]): PaymentRequired {
  return {
    x402Version: 2,
    resource: { url: "https://example.com/report" },
    accepts,
  };
}

describe("selectPaymentRequirements", () => {
  it("prioritizes USDC over non-USDC and returns the accepted index", () => {
    const paymentRequired = makePaymentRequired([
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: "0x0000000000000000000000000000000000000001",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ]);

    expect(selectPaymentRequirements(paymentRequired)).toBe(1);
  });

  it("returns the first requirement when no USDC option exists", () => {
    const paymentRequired = makePaymentRequired([
      {
        scheme: "exact",
        network: "eip155:84532",
        asset: "0x0000000000000000000000000000000000000001",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: "0x0000000000000000000000000000000000000002",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ]);

    expect(selectPaymentRequirements(paymentRequired)).toBe(0);
  });

  it("filters by scheme and network before selecting", () => {
    const paymentRequired = makePaymentRequired([
      {
        scheme: "upto",
        network: "eip155:8453",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      {
        scheme: "exact",
        network: "eip155:84532",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ]);

    expect(selectPaymentRequirements(paymentRequired, "eip155:8453", "exact")).toBe(2);
  });

  it("returns the first broadly accepted entry if no USDC is present after filtering", () => {
    const paymentRequired = makePaymentRequired([
      {
        scheme: "exact",
        network: "eip155:137",
        asset: "0x0000000000000000000000000000000000000001",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: "0x0000000000000000000000000000000000000002",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ]);

    expect(selectPaymentRequirements(paymentRequired, ["eip155:137", "eip155:8453"])).toBe(0);
  });

  it("falls back to index 0 if network filtering finds no matches", () => {
    const paymentRequired = makePaymentRequired([
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "1000",
        payTo: "0x1111111111111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      {
        scheme: "exact",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1000",
        payTo: "11111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ]);

    expect(selectPaymentRequirements(paymentRequired, "eip155:1")).toBe(0);
  });

  it("supports Solana USDC selection", () => {
    const paymentRequired = makePaymentRequired([
      {
        scheme: "exact",
        network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        asset: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        amount: "1000",
        payTo: "11111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      {
        scheme: "exact",
        network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        asset: "11111111111111111111111111111111",
        amount: "1000",
        payTo: "11111111111111111111111111111111",
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ]);

    expect(selectPaymentRequirements(paymentRequired)).toBe(0);
  });

  it("throws when paymentRequired.accepts is empty", () => {
    const paymentRequired = makePaymentRequired([]);
    expect(() => selectPaymentRequirements(paymentRequired)).toThrow(
      "paymentRequired.accepts must contain at least one payment requirement.",
    );
  });
});
