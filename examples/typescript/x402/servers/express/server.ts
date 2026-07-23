// Usage: pnpm start

/**
 * Express resource server protected by x402 using the CDP SDK.
 *
 * This file shows three progressively simpler approaches, all using the same
 * CDP hosted facilitator under the hood:
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * APPROACH 1 — Drop in the CDP facilitator into an existing x402 server setup.
 *
 * If you already have an `x402ResourceServer` or are calling `paymentMiddleware`
 * manually, swap the facilitator argument with `createCdpFacilitatorClient()`.
 * No other changes needed — it returns the same `HTTPFacilitatorClient` type.
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, PAY_TO (EVM address)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * APPROACH 2 — One-liner server with inline route config.
 *
 * `createX402Server` provisions a receiver wallet, wires the CDP facilitator,
 * and returns a fully initialized `x402HTTPResourceServer`. No PAY_TO needed —
 * the wallet addresses are exposed on the returned server object. This approach
 * also demonstrates the `upto` scheme (usage-based billing) on `GET /usage`
 * alongside the default `exact`-scheme `GET /report` route.
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * APPROACH 3 — One-liner server loaded from a config file (configPath).
 *
 * Same as Approach 2 but routes (and optionally credentials) are read from a
 * JSON file. Inline config always wins when both are provided.
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 *   + x402.config.json (see the file in this directory; x402.config.schema.json
 *     documents every supported field)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Run:
 *   pnpm install (from this directory or the examples/typescript root)
 *   APPROACH=1 PAY_TO=0x... pnpm start    # drop-in facilitator swap
 *   APPROACH=2 pnpm start                  # inline config
 *   APPROACH=3 pnpm start                  # config file
 */
import "dotenv/config";

import express from "express";
import type { Address } from "viem";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  paymentMiddleware,
  paymentMiddlewareFromHTTPServer,
  setSettlementOverrides,
  x402ResourceServer,
} from "@x402/express";
import { createCdpFacilitatorClient, createX402Server } from "@coinbase/cdp-sdk/x402";

const APPROACH = process.env.APPROACH ?? "2";
const app = express();

// ─── Approach 1: Drop in the CDP facilitator into an existing server setup ──

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

  app.get("/report", (_req, res) => res.json({ report: "..." }));
  app.listen(8402, () =>
    console.log(`Listening on http://localhost:8402\nReceiving EVM payments at ${PAY_TO}`),
  );

// ─── Approach 2: One-liner server with inline route config ──────────────────

} else if (APPROACH === "2") {
  // createX402Server provisions a receiver wallet, wires the CDP facilitator,
  // and returns a fully initialized x402HTTPResourceServer — all in one call.
  const server = await createX402Server({
    routes: {
      "GET /report": { price: "$0.01", description: "AI-generated report" },
      // networks defaults to Base mainnet + Solana mainnet for "exact" scheme.
      // Override with networks: ["eip155:8453"] to restrict to EVM-only, etc.

      // Usage-based billing with the "upto" scheme: the client authorizes a
      // ceiling ($0.10 here) and the server settles only the amount actually
      // used (see the /usage handler below). createX402Server auto-registers
      // the upto scheme, so the route config is all that's needed here. upto
      // is EVM-only; pinned to Base Sepolia so the demo funds on testnet.
      "GET /usage": {
        price: "$0.10",
        scheme: "upto",
        networks: ["eip155:84532"],
        description: "Usage-based billing — authorize up to $0.10, settle actual usage",
      },
    },
    // Optional: bring your own addresses instead of provisioning a CDP wallet.
    // payToConfig: { type: "address", evm: "0x...", solana: "..." },
  });

  // server IS an x402HTTPResourceServer — pass it to any x402 middleware.
  app.use(paymentMiddlewareFromHTTPServer(server));
  app.get("/report", (_req, res) => res.json({ report: "..." }));

  // upto route: compute a variable charge at or below the authorized max, then
  // tell the middleware to settle only that amount via setSettlementOverrides.
  // In production this would be real usage — LLM tokens, bytes served, etc.
  app.get("/usage", (_req, res) => {
    const maxAtomic = 100_000; // $0.10 in 6-decimal USDC atomic units
    const actualAtomic = Math.floor(Math.random() * (maxAtomic + 1));
    setSettlementOverrides(res, { amount: String(actualAtomic) });
    res.json({
      result: "Here is your usage-metered response...",
      usage: {
        authorizedMaxAtomic: String(maxAtomic),
        actualChargedAtomic: String(actualAtomic),
      },
    });
  });

  app.listen(8402, () =>
    console.log(
      `Listening on http://localhost:8402\n` +
        `Receiving EVM payments at ${server.payToEvmAddress}\n` +
        `Receiving Solana payments at ${server.payToSvmAddress}`,
    ),
  );

// ─── Approach 3: One-liner server loaded from a config file ─────────────────

} else if (APPROACH === "3") {
  // Routes (and optionally credentials) live in a JSON config file.
  // Inline config always takes precedence when both are provided.
  //
  // See ./x402.config.json for the config loaded here, and
  // ./x402.config.schema.json for the full documented schema (all fields:
  // routes, payToConfig, environment, credentials). Tip: prefer env vars for
  // credentials and keep this file to `routes` — don't commit secrets.
  const server = await createX402Server({
    configPath: "./x402.config.json",
    routes: {
      "GET /report": { price: "$0.01", description: "AI-generated report" },
    },
    // Inline routes here would override the file's routes for matched keys.
  });

  app.use(paymentMiddlewareFromHTTPServer(server));
  app.get("/report", (_req, res) => res.json({ report: "..." }));
  app.listen(8402, () =>
    console.log(
      `Listening on http://localhost:8402\n` +
        `Receiving EVM payments at ${server.payToEvmAddress}\n` +
        `Receiving Solana payments at ${server.payToSvmAddress}`,
    ),
  );
}
