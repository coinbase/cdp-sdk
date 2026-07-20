// Usage: pnpm start

/**
 * Hono resource server protected by x402 using the CDP SDK.
 *
 * This is the Hono twin of the Express example — the only difference is the
 * framework adapter. The CDP primitives are identical, which is the point:
 * `createX402Server` and `createCdpFacilitatorClient` produce standard x402
 * objects, so they drop into any framework's middleware unchanged.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * APPROACH 1 — Drop the CDP facilitator into an existing x402 server setup.
 *
 * If you already have an `x402ResourceServer` or call `paymentMiddleware`
 * manually, swap the facilitator argument with `createCdpFacilitatorClient()`.
 * It returns the same `HTTPFacilitatorClient` type — nothing else changes.
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, PAY_TO (EVM address)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * APPROACH 2 — One-liner server with inline route config.
 *
 * `createX402Server` provisions a receiver wallet, wires the CDP facilitator,
 * and returns a fully initialized `X402Server` (an `x402HTTPResourceServer`).
 * No PAY_TO needed — the wallet addresses are exposed on the returned object.
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Run:
 *   pnpm install (from this directory or the examples/typescript root)
 *   APPROACH=1 PAY_TO=0x... pnpm start   # drop-in facilitator swap
 *   APPROACH=2 pnpm start                 # inline config (default)
 */
import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Address } from "viem";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, paymentMiddlewareFromHTTPServer, x402ResourceServer } from "@x402/hono";
import { createCdpFacilitatorClient, createX402Server } from "@coinbase/cdp-sdk/x402";

const APPROACH = process.env.APPROACH ?? "2";
const app = new Hono();

// ─── Approach 1: Drop the CDP facilitator into an existing server setup ─────

if (APPROACH === "1") {
  const PAY_TO = (process.env.PAY_TO ?? "") as Address;
  if (!PAY_TO) throw new Error("PAY_TO env var required (an EVM address to receive payments)");

  // Before — self-hosted or other facilitator:
  //   new HTTPFacilitatorClient({ url: process.env.FACILITATOR_URL, createAuthHeaders })
  //
  // After — CDP hosted facilitator (same type, drop-in replacement):
  const facilitator = createCdpFacilitatorClient();

  // Wire into your existing x402 server exactly as before — nothing else changes.
  const server = new x402ResourceServer(facilitator).register("eip155:84532", new ExactEvmScheme());

  app.use(
    paymentMiddleware(
      {
        "GET /report": {
          accepts: [{ scheme: "exact", price: "$0.01", network: "eip155:84532", payTo: PAY_TO }],
          description: "AI-generated report",
        },
      },
      server,
    ),
  );

  app.get("/report", c => c.json({ report: "..." }));
  serve({ fetch: app.fetch, port: 8402 }, () =>
    console.log(`Listening on http://localhost:8402\nReceiving EVM payments at ${PAY_TO}`),
  );

// ─── Approach 2: One-liner server with inline route config ──────────────────

} else {
  // createX402Server provisions a receiver wallet, wires the CDP facilitator,
  // and returns an X402Server (extends x402HTTPResourceServer) — all in one call.
  const server = await createX402Server({
    routes: {
      "GET /report": { price: "$0.01", description: "AI-generated report" },
      // networks defaults to Base mainnet + Solana mainnet for "exact" scheme.
      // Override with networks: ["eip155:8453"] to restrict to EVM-only, etc.
    },
    // Optional: bring your own addresses instead of provisioning a CDP wallet.
    // payToConfig: { type: "address", evm: "0x...", solana: "..." },
  });

  // server IS an x402HTTPResourceServer — pass it to any x402 middleware.
  app.use(paymentMiddlewareFromHTTPServer(server));
  app.get("/report", c => c.json({ report: "..." }));
  serve({ fetch: app.fetch, port: 8402 }, () =>
    console.log(
      `Listening on http://localhost:8402\n` +
        `Receiving EVM payments at ${server.payToEvmAddress}\n` +
        `Receiving Solana payments at ${server.payToSvmAddress}`,
    ),
  );
}
