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
 *
 * Set X402_ENABLE_SOLANA_UPTO=true to also add `GET /usage-solana` — the same
 * `upto` scheme restricted to Solana Devnet. The CDP SDK's resource server
 * supports it out of the box, but it's opt-in here because the CDP-hosted
 * facilitator doesn't advertise `upto` support for Solana yet (only `exact`)
 * — enabling it unconditionally would fail this server's startup validation.
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
import { config } from "dotenv";

// Servers run from their own directory, so load a local .env if there is one and
// otherwise fall back to the shared examples/typescript/.env.
config({ path: [".env", "../../../.env"] });

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
const PORT = Number(process.env.PORT ?? 8402);
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
          accepts: [
            {
              scheme: "exact",
              price: "$0.01",
              network: "eip155:84532",
              payTo: PAY_TO,
            },
          ],
          description: "AI-generated report",
        },
      },
      server,
    ),
  );

  app.get("/report", (_req, res) => res.json({ report: "..." }));
  app.listen(PORT, () =>
    console.log(`Listening on http://localhost:${PORT}\nReceiving EVM payments at ${PAY_TO}`),
  );

  // ─── Approach 2: One-liner server with inline route config ──────────────────
} else if (APPROACH === "2") {
  /*
   * Solana "upto" is registered by the CDP SDK's resource server (see
   * `getCdpDefaultSchemes` in `@coinbase/cdp-sdk/x402`), but `x402ResourceServer`
   * validates every configured route against the facilitator's advertised
   * `/supported` list at startup — and the CDP-hosted facilitator doesn't
   * advertise `upto` support for any `solana:*` network yet, only `exact`.
   * Configuring `GET /usage-solana` unconditionally would make this whole
   * server fail to start today. Gate it behind an explicit opt-in so this
   * demo keeps working out of the box; flip it on once the facilitator picks
   * up Solana `upto` support to exercise the SDK's (already-implemented,
   * unit-tested) side of it end-to-end.
   */
  const ENABLE_SOLANA_UPTO = process.env.X402_ENABLE_SOLANA_UPTO === "true";

  // createX402Server provisions a receiver wallet, wires the CDP facilitator,
  // and returns a fully initialized x402HTTPResourceServer — all in one call.
  const server = await createX402Server({
    // "development" defaults every route to Base Sepolia + Solana Devnet, so the
    // demo settles on testnet. Drop it (or use "production") to go to mainnet.
    environment: "development",
    routes: {
      "GET /report": { price: "$0.01", description: "AI-generated report" },
      // Override the environment default per route with e.g.
      // networks: ["eip155:84532"] to restrict this route to EVM-only.

      // Usage-based billing with the "upto" scheme: the client authorizes a
      // ceiling ($0.10 here) and the server settles only the amount actually
      // used (see the /usage handler below). createX402Server auto-registers
      // the upto scheme, so the route config is all that's needed here.
      "GET /usage": {
        price: "$0.10",
        scheme: "upto",
        description: "Usage-based billing — authorize up to $0.10, settle actual usage",
      },

      // Same usage-based billing as /usage, restricted to Solana Devnet — see
      // the ENABLE_SOLANA_UPTO comment above for why this is opt-in.
      ...(ENABLE_SOLANA_UPTO && {
        "GET /usage-solana": {
          price: "$0.10",
          scheme: "upto",
          networks: ["solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"],
          description: "Usage-based billing on Solana — authorize up to $0.10, settle actual usage",
        },
      }),
    },
    // Optional: bring your own addresses instead of provisioning a CDP wallet.
    // payToConfig: { type: "address", evm: "0x...", solana: "..." },
  });

  // server IS an x402HTTPResourceServer — pass it to any x402 middleware.
  app.use(paymentMiddlewareFromHTTPServer(server));
  app.get("/report", (_req, res) => res.json({ report: "..." }));

  /**
   * Computes a variable charge at or below the route's authorized max, then
   * tells the middleware to settle only that amount via
   * `setSettlementOverrides`. In production this would be real usage — LLM
   * tokens, bytes served, etc. The "upto" scheme's settlement flow doesn't
   * differ between EVM and Solana from the route handler's point of view, so
   * `/usage` and `/usage-solana` share this same handler.
   *
   * @param res - The Express response to attach the settlement override to.
   * @param resultLabel - Text describing the result, distinguishing the EVM vs Solana route in the response body.
   */
  function handleUsageRequest(res: express.Response, resultLabel: string) {
    const maxAtomic = 100_000; // the route's $0.10 price, in 6-decimal USDC atomic units
    const actualAtomic = 1 + Math.floor(Math.random() * maxAtomic);
    setSettlementOverrides(res, { amount: String(actualAtomic) });
    res.json({
      result: resultLabel,
      usage: {
        authorizedMaxAtomic: String(maxAtomic),
        actualChargedAtomic: String(actualAtomic),
      },
    });
  }

  app.get("/usage", (_req, res) =>
    handleUsageRequest(res, "Here is your usage-metered response..."),
  );

  if (ENABLE_SOLANA_UPTO) {
    app.get("/usage-solana", (_req, res) =>
      handleUsageRequest(res, "Here is your Solana usage-metered response..."),
    );
  }

  /*
   * ─── auth-capture smoke test — not a real payment route ───────────────────
   *
   * `AuthCaptureEvmScheme` is client-only server-side today (see the
   * `@x402/evm` auth-capture README) — `createX402Server` deliberately never
   * registers it. This hand-rolled route lets the CLI matrix prove
   * `CdpX402Client` can sign and send an auth-capture payload end-to-end
   * without a real facilitator settling it: it manually builds a v2
   * `PaymentRequired` 402 (base64-encoded on the `PAYMENT-REQUIRED` header,
   * since `wrapFetchWithPayment` only reads v2 payment-required data from
   * headers, not the JSON body), then on retry just confirms a signed
   * `PAYMENT-SIGNATURE` header arrived and returns 501 instead of settling.
   */
  const AUTH_CAPTURE_USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  app.get("/auth-capture-mock", (req, res) => {
    if (req.header("PAYMENT-SIGNATURE")) {
      res.status(501).json({
        error:
          "auth-capture has no server/facilitator support yet — payload received, not settled.",
      });
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const paymentRequired = {
      x402Version: 2,
      resource: {
        url: "https://example.com/auth-capture-mock",
        mimeType: "application/json",
      },
      accepts: [
        {
          scheme: "auth-capture",
          network: "eip155:84532",
          asset: AUTH_CAPTURE_USDC_BASE_SEPOLIA,
          amount: "10000",
          payTo: server.payToEvmAddress,
          maxTimeoutSeconds: 300,
          extra: {
            captureAuthorizer: server.payToEvmAddress,
            feeRecipient: server.payToEvmAddress,
            captureDeadline: nowSeconds + 3600,
            refundDeadline: nowSeconds + 7200,
            minFeeBps: 0,
            maxFeeBps: 0,
            name: "USDC",
            version: "2",
          },
        },
      ],
    };

    res
      .status(402)
      .set("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(paymentRequired)).toString("base64"))
      .json(paymentRequired);
  });

  app.listen(PORT, () =>
    console.log(
      `Listening on http://localhost:${PORT}\n` +
        `Receiving EVM payments at ${server.payToEvmAddress}\n` +
        `Receiving Solana payments at ${server.payToSvmAddress}`,
    ),
  );

  // ─── Approach 3: One-liner server loaded from a config file ─────────────────
} else if (APPROACH === "3") {
  // Routes (and optionally credentials) live in a JSON config file.
  // Inline config always takes precedence when both are provided.
  //
  // See ./x402.config.json for the config loaded here — it sets
  // "environment": "development" so this demo settles on Base Sepolia — and
  // ./x402.config.schema.json for the full documented schema (all fields:
  // routes, payToConfig, environment, credentials). Tip: prefer env vars for
  // credentials and keep this file to `routes` — don't commit secrets.
  const server = await createX402Server({
    configPath: "./x402.config.json",
    // Adding `routes` here would override the file's entry for any matching
    // key, which is how you keep a shared config file and still special-case
    // one route in code.
  });

  app.use(paymentMiddlewareFromHTTPServer(server));
  app.get("/report", (_req, res) => res.json({ report: "..." }));
  app.listen(PORT, () =>
    console.log(
      `Listening on http://localhost:${PORT}\n` +
        `Receiving EVM payments at ${server.payToEvmAddress}\n` +
        `Receiving Solana payments at ${server.payToSvmAddress}`,
    ),
  );
} else {
  throw new Error(`Unknown APPROACH "${APPROACH}" — set APPROACH to 1, 2, or 3.`);
}
