/**
 * End-to-end tests for the CDP x402 "upto" payment scheme.
 *
 * The `upto` scheme is usage-based: the client signs a Permit2 authorization
 * for a maximum amount, and the server settles the actual amount charged
 * (≤ max) when the request completes.
 *
 * This test spins up a local Express resource server whose route is
 * configured with `scheme: "upto"` and verifies that a real Permit2-based
 * payment succeeds end-to-end on Base Sepolia using the CDP hosted
 * facilitator.
 *
 * Required environment variables:
 *   - CDP_API_KEY_ID
 *   - CDP_API_KEY_SECRET
 *   - CDP_WALLET_SECRET
 *
 * The payer wallet must hold enough USDC on Base Sepolia and have an
 * existing Permit2 allowance (or have the eip2612GasSponsoring extension
 * available to obtain a gasless approval).
 *
 * Run with:
 *   pnpm test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import * as x402Express from "@x402/express";
import { createCdpResourceServer, createCdpX402Client, wrapFetchWithPayment } from "@coinbase/x402";
import type { CdpX402ClientResult } from "@coinbase/x402";

// Port chosen to avoid conflict with other e2e servers:
//   4021 = main resource server (cdp-fetch, cdp-scw tests)
//   4022 = Go e2e server (go/server_e2e.go)
//   4023 = Python e2e server (python/server_e2e.py)
//   4025 = bazaar e2e test
const UPTO_SERVER_PORT = 4024;
const UPTO_SERVER_URL = `http://localhost:${UPTO_SERVER_PORT}`;
const PROTECTED_PATH = "/protected";
const PROTECTED_OVER_LIMIT_PATH = "/protected-over-limit";
const PAYMENT_PRICE = "$0.001";
const supportsSettlementOverrides =
  typeof (x402Express as { setSettlementOverrides?: unknown }).setSettlementOverrides ===
  "function";
// Base Sepolia — upto scheme is EVM-only.
const EVM_NETWORK = "eip155:84532" as const;

const hasRequiredCredentials = Boolean(
  process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET,
);
const describeWithCredentials = hasRequiredCredentials ? describe : describe.skip;

describeWithCredentials("CDP x402 E2E (upto scheme, EOA client, EOA receiver)", () => {
  let result: CdpX402ClientResult;
  let server: Server;
  let payToEvmAddress: `0x${string}`;

  beforeAll(async () => {
    result = await createCdpX402Client({
      walletConfig: {
        accountName: process.env.CDP_ACCOUNT_NAME ?? "x402-e2e-test",
      },
    });

    // Start a resource server that advertises the "upto" scheme.
    // CdpResourceServer provisions its own dedicated receiver wallet and
    // registers UptoEvmScheme (server-side) automatically.
    const cdpServer = await createCdpResourceServer({
      routes: {
        [`GET ${PROTECTED_PATH}`]: {
          price: PAYMENT_PRICE,
          scheme: "upto",
          description: "x402 upto e2e test endpoint",
          networks: [EVM_NETWORK],
        },
        [`GET ${PROTECTED_OVER_LIMIT_PATH}`]: {
          price: PAYMENT_PRICE,
          scheme: "upto",
          description: "x402 upto over-limit settlement test endpoint",
          networks: [EVM_NETWORK],
        },
      },
    });

    const app = express();
    app.use(x402Express.paymentMiddlewareFromHTTPServer(cdpServer, undefined, undefined, false));
    app.get(PROTECTED_PATH, (_req, res) => {
      res.json({ message: "upto payment accepted" });
    });
    app.get(PROTECTED_OVER_LIMIT_PATH, (_req, res) => {
      // Deliberately exceed maxAmount to validate settlement override behavior.
      res.setHeader("Settlement-Overrides", JSON.stringify({ amount: "999999999999999999" }));
      res.json({ message: "upto payment accepted" });
    });
    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    app.use(
      (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error("[upto-resource-server] unhandled error:", err);
        res.status(500).json({ error: err.message });
      },
    );

    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server.listen(UPTO_SERVER_PORT, resolve);
      server.once("error", reject);
    });

    payToEvmAddress = cdpServer.payToEvmAddress;
  }, 60_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should provision a CDP EVM account for the payer", () => {
    expect(result.evmAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("should have a configured x402 client with upto scheme support", () => {
    expect(result.client).toBeDefined();
  });

  it("resource server provisions a valid EVM receiver address", () => {
    expect(payToEvmAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("payer and receiver are distinct addresses", () => {
    expect(result.evmAddress.toLowerCase()).not.toBe(payToEvmAddress.toLowerCase());
  });

  it("should complete a real upto payment on Base Sepolia", async () => {
    const wrappedFetch = wrapFetchWithPayment(fetch, result.client);
    const response = await wrappedFetch(`${UPTO_SERVER_URL}${PROTECTED_PATH}`);
    const body = await response.json().catch(() => null);
    expect(response.status, `Upto payment failed: ${JSON.stringify(body)}`).toBe(200);
    expect(body).toMatchObject({ message: "upto payment accepted" });
  }, 30_000);

  const maybeIt = supportsSettlementOverrides ? it : it.skip;
  maybeIt(
    "should enforce settlement override amount and reject amounts above max",
    async () => {
      const wrappedFetch = wrapFetchWithPayment(fetch, result.client);
      // This route always emits an over-limit settlement override and should fail with 402.
      const response = await wrappedFetch(`${UPTO_SERVER_URL}${PROTECTED_OVER_LIMIT_PATH}`);
      const body = await response.json().catch(() => null);
      expect(response.status, `Expected settlement override failure: ${JSON.stringify(body)}`).toBe(
        402,
      );
    },
    30_000,
  );
});
