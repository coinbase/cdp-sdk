/**
 * Integration tests for the CDP x402 client.
 *
 * CDP-backed tests require real credentials and are skipped when absent:
 *   CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 *
 * To run all tests:
 *   cp .env.example .env  # fill in your credentials
 *   pnpm test
 *
 * These tests provision real CDP accounts and make real API calls.
 * They use getOrCreateAccount so repeated runs reuse existing accounts.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { createCdpX402Client, CdpX402Client } from "../../../src/core/client/index.js";
import type { CdpX402ClientResult } from "../../../src/core/client/index.js";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";

// ---------------------------------------------------------------------------
// Credential guards
// ---------------------------------------------------------------------------

const hasCdpCreds = !!(
  process.env.CDP_API_KEY_ID &&
  process.env.CDP_API_KEY_SECRET &&
  process.env.CDP_WALLET_SECRET
);

// ---------------------------------------------------------------------------
// wrapFetchWithPayment — no credentials required
// ---------------------------------------------------------------------------

describe("wrapFetchWithPayment (integration)", () => {
  it("returns a fetch-compatible function", () => {
    const client = new x402Client();
    const wrapped = wrapFetchWithPayment(fetch, client);
    expect(typeof wrapped).toBe("function");
  });

  it("passes non-402 responses through transparently", async () => {
    const client = new x402Client();
    const mockedFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = wrapFetchWithPayment(mockedFetch as unknown as typeof fetch, client);
    const res = await wrapped("https://example.com/no-payment");
    expect(res.status).toBe(200);
    expect(mockedFetch).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// CDP-backed tests — skipped when credentials are absent
// ---------------------------------------------------------------------------

describe.skipIf(!hasCdpCreds)("createCdpX402Client (cdp-eoa, integration)", () => {
  let result: CdpX402ClientResult;

  beforeAll(async () => {
    result = await createCdpX402Client({
      walletConfig: { accountName: "x402-integration-test" },
    });
  }, 30_000);

  it("returns a valid EVM address", () => {
    expect(result.evmAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("returns a valid Solana address", () => {
    expect(result.svmAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });

  it("does not set ownerWallet for EOA type", () => {
    expect(result.ownerWallet).toBeUndefined();
  });

  it("exposes a cdpClient", () => {
    expect(result.cdpClient).toBeDefined();
  });

  it("returns an x402Client", () => {
    expect(result.client).toBeInstanceOf(x402Client);
  });
});

describe.skipIf(!hasCdpCreds)("createCdpX402Client (cdp-smart, integration)", () => {
  let result: CdpX402ClientResult;

  beforeAll(async () => {
    result = await createCdpX402Client({
      walletConfig: {
        type: "cdp-smart",
        accountName: "x402-integration-scw",
        ownerAccountName: "x402-integration-scw-owner",
      },
    });
  }, 30_000);

  it("returns a valid SCW address as evmAddress", () => {
    expect(result.evmAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("returns the owner account name as ownerWallet", () => {
    expect(result.ownerWallet).toBe("x402-integration-scw-owner");
  });
});

describe.skipIf(!hasCdpCreds)("CdpX402Client (cdp-eoa, integration)", () => {
  it("provisions a CDP account on first lazy init", async () => {
    const client = new CdpX402Client({
      walletConfig: { accountName: "x402-integration-test" },
    });

    // Trigger lazy init — any error here would be a wallet provisioning error,
    // not a payment requirements error.
    try {
      await client.createPaymentPayload({
        x402Version: 2,
        accepts: [],
        error: "",
        resource: "https://api.example.com/paid",
      } as never);
    } catch (err) {
      const msg = (err as Error).message;
      // If the error is NOT about wallet setup, init succeeded.
      expect(msg).not.toMatch(/credentials|CDP_API_KEY|walletSecret/i);
    }
  }, 30_000);
});
