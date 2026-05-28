/**
 * Integration tests for `applySpendControls` against a real upstream
 * `x402Client`. The scheme client is mocked so we can spy on
 * `createPaymentPayload` and confirm the policy filters payments *before*
 * they reach the scheme.
 */
import { describe, it, expect, vi } from "vitest";
import { x402Client } from "@x402/core/client";

import { applySpendControls } from "../../../src/core/guardrails/apply.js";
import { SpendControlError } from "../../../src/core/guardrails/types.js";
import type { PaymentRequired, PaymentRequirements } from "@x402/core/types";
import type { SpendStore } from "../../../src/core/guardrails/types.js";

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

function paymentRequired(overrides: Partial<PaymentRequirements>[] = []): PaymentRequired {
  const accepts: PaymentRequirements[] =
    overrides.length === 0
      ? [
          {
            scheme: "exact",
            network: NETWORK,
            asset: ASSET,
            amount: "100000",
            payTo: "0x1111111111111111111111111111111111111111",
            maxTimeoutSeconds: 60,
            extra: {},
          },
        ]
      : overrides.map((o) => ({
          scheme: "exact",
          network: NETWORK,
          asset: ASSET,
          amount: "100000",
          payTo: "0x1111111111111111111111111111111111111111",
          maxTimeoutSeconds: 60,
          extra: {},
          ...o,
        }));
  return {
    x402Version: 2,
    error: "",
    resource: "https://example.com/test" as never,
    accepts,
  };
}

describe("guardrails/apply.integration", () => {
  it("rejects per_payment_cap before the scheme client is invoked", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);

    applySpendControls(client, {
      maxAmountPerPayment: { atomic: 50_000n, asset: ASSET },
    });

    await expect(client.createPaymentPayload(paymentRequired())).rejects.toThrow(/per-payment cap/);
    expect(scheme.createPaymentPayload).not.toHaveBeenCalled();
  });

  it("accumulates and rejects on the offending payment for cumulative_cap", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);

    applySpendControls(client, {
      maxCumulativeSpend: { atomic: 250_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });

    // Each payment is 100_000. After two, total=200_000; the third would push
    // to 300_000 > 250_000.
    await client.createPaymentPayload(paymentRequired());
    await client.createPaymentPayload(paymentRequired());
    await expect(client.createPaymentPayload(paymentRequired())).rejects.toThrow(
      /cumulative spend/,
    );
    // Two successful, one rejected → scheme called twice.
    expect(scheme.createPaymentPayload).toHaveBeenCalledTimes(2);
  });

  it("counts EVM assets case-insensitively for cumulative caps", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);

    applySpendControls(client, {
      maxCumulativeSpend: { atomic: 150_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });

    const mixedCaseAsset = `0x${ASSET.slice(2).toUpperCase()}`;
    await client.createPaymentPayload(paymentRequired([{ asset: mixedCaseAsset }]));
    await expect(client.createPaymentPayload(paymentRequired())).rejects.toThrow(
      /cumulative spend/,
    );
    expect(scheme.createPaymentPayload).toHaveBeenCalledTimes(1);
  });

  it("filters disallowed payees via the policy before the selector runs", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);

    const allowedPayee = "0xAAA0000000000000000000000000000000000000";
    const blockedPayee = "0xBBB0000000000000000000000000000000000000";

    applySpendControls(client, {
      allowedPayees: [allowedPayee],
    });

    // Both options exist in `accepts` but only the allowed one passes the policy.
    const payload = await client.createPaymentPayload(
      paymentRequired([{ payTo: blockedPayee }, { payTo: allowedPayee.toLowerCase() }]),
    );
    expect(payload.accepted.payTo).toBe(allowedPayee.toLowerCase());
    expect(scheme.createPaymentPayload).toHaveBeenCalledTimes(1);
    // The scheme client never sees the blocked payee.
    const seenPayee = (scheme.createPaymentPayload.mock.calls[0][1] as PaymentRequirements).payTo;
    expect(seenPayee).toBe(allowedPayee.toLowerCase());
  });

  it("throws SpendControlError(payee_not_allowed) when allow-list filters every requirement", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);
    applySpendControls(client, {
      allowedPayees: ["0xAAA0000000000000000000000000000000000000"],
    });
    await expect(
      client.createPaymentPayload(
        paymentRequired([{ payTo: "0xBBB0000000000000000000000000000000000000" }]),
      ),
    ).rejects.toMatchObject({
      code: "payee_not_allowed",
    });
    expect(scheme.createPaymentPayload).not.toHaveBeenCalled();
  });

  it("filters by allowedNetworks (CAIP form)", async () => {
    const client = new x402Client();
    const scheme84532 = fakeSchemeClient();
    const scheme8453 = fakeSchemeClient();
    client.register("eip155:84532", scheme84532 as never);
    client.register("eip155:8453", scheme8453 as never);

    applySpendControls(client, {
      allowedNetworks: ["eip155:84532"],
    });

    const accepts: Partial<PaymentRequirements>[] = [
      { network: "eip155:8453" },
      { network: "eip155:84532" },
    ];
    await client.createPaymentPayload(paymentRequired(accepts));
    expect(scheme84532.createPaymentPayload).toHaveBeenCalledTimes(1);
    expect(scheme8453.createPaymentPayload).not.toHaveBeenCalled();
  });

  it("is a no-op when `controls` is empty", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);
    applySpendControls(client, {});
    await expect(client.createPaymentPayload(paymentRequired())).resolves.toBeDefined();
    expect(scheme.createPaymentPayload).toHaveBeenCalledTimes(1);
  });

  it("propagates SpendControlError directly from the upstream beforeHook", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    client.register(NETWORK, scheme as never);

    applySpendControls(client, {
      maxAmountPerPayment: { atomic: 1n, asset: ASSET },
    });

    let caught: unknown;
    try {
      await client.createPaymentPayload(paymentRequired());
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SpendControlError);
    expect((caught as SpendControlError).code).toBe("per_payment_cap");
    expect((caught as SpendControlError).details).toMatchObject({
      attempted: "100000",
      limit: "1",
    });
  });

  it("rolls back the anticipatory ledger record when the scheme client fails", async () => {
    const client = new x402Client();
    const scheme = fakeSchemeClient();
    // First two calls succeed, third throws.
    let callCount = 0;
    scheme.createPaymentPayload.mockImplementation(
      async (x402Version: number, requirements: PaymentRequirements) => {
        callCount++;
        if (callCount === 3) throw new Error("scheme blew up");
        return {
          x402Version,
          payload: { stub: true },
          extensions: undefined,
          resource: "https://example.com/test" as never,
          accepted: requirements,
        };
      },
    );
    client.register(NETWORK, scheme as never);

    const resolved = applySpendControls(client, {
      // Cap headroom for all three before-hook checks; the third call
      // passes the cap check, then the scheme throws, then the failure
      // hook rolls back the anticipatory record.
      maxCumulativeSpend: { atomic: 500_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h",
    });

    await client.createPaymentPayload(paymentRequired());
    await client.createPaymentPayload(paymentRequired());
    await expect(client.createPaymentPayload(paymentRequired())).rejects.toThrow(/scheme blew up/);
    // After rollback the cumulative total reflects only the two successes.
    expect(await resolved.tracker.total({ asset: ASSET })).toBe(200_000n);
  });

  it("rejects a second applySpendControls() on the same upstream client", () => {
    const client = new x402Client();
    applySpendControls(client, {});
    expect(() => applySpendControls(client, {})).toThrowError(
      expect.objectContaining({
        code: "already_applied",
      }),
    );
  });

  it("serializes cumulative checks across clients sharing one store", async () => {
    const sharedStoreEntries: Array<unknown> = [];
    const sharedStore: SpendStore = {
      async load() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return sharedStoreEntries as any;
      },
      async append(entry) {
        sharedStoreEntries.push(entry);
      },
      async prune() {
        /* no-op */
      },
      async removeEntry(entry) {
        const idx = sharedStoreEntries.lastIndexOf(entry);
        if (idx >= 0) sharedStoreEntries.splice(idx, 1);
      },
    };

    const clientA = new x402Client();
    const clientB = new x402Client();
    const schemeA = fakeSchemeClient();
    const schemeB = fakeSchemeClient();
    clientA.register(NETWORK, schemeA as never);
    clientB.register(NETWORK, schemeB as never);

    const controls = {
      maxCumulativeSpend: { atomic: 150_000n, asset: ASSET },
      maxCumulativeSpendWindow: "1h" as const,
      store: sharedStore,
    };
    applySpendControls(clientA, controls);
    applySpendControls(clientB, controls);

    const result = await Promise.allSettled([
      clientA.createPaymentPayload(paymentRequired()),
      clientB.createPaymentPayload(paymentRequired()),
    ]);
    const rejected = result.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: "cumulative_cap",
    });
    expect(
      schemeA.createPaymentPayload.mock.calls.length +
        schemeB.createPaymentPayload.mock.calls.length,
    ).toBe(1);
  });
});
