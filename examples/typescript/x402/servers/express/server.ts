// Usage: pnpm start

/**
 * Express resource server protected by x402 using the CDP hosted facilitator.
 *
 * This example demonstrates drop-in functionality of the CDP hosted
 * facilitator as a replacement for a self-hosted one, with no other changes
 * to your existing x402 setup.
 *
 * `createCdpFacilitatorClient()` returns an `HTTPFacilitatorClient` — the
 * same type returned by `new HTTPFacilitatorClient(...)` — so it works
 * anywhere you pass a facilitator to `x402ResourceServer` or middleware.
 *
 * Setup:
 *   Set CDP_API_KEY_ID and CDP_API_KEY_SECRET in your environment (or .env).
 *   Set PAY_TO to the EVM address that should receive payments.
 *
 * Run:
 *   pnpm install (from this directory or the examples/typescript root)
 *   PAY_TO=0x... pnpm start
 */
import "dotenv/config";

import express from "express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";

const PAY_TO = (process.env.PAY_TO ?? "") as `0x${string}`;
if (!PAY_TO) throw new Error("PAY_TO env var required (an EVM address to receive payments)");

// Drop in the CDP hosted facilitator — auth handled automatically via CDP API keys.
// This is a direct replacement for `new HTTPFacilitatorClient({ url, createAuthHeaders })`.
const facilitator = createCdpFacilitatorClient();

// Wire into your existing x402 resource server exactly as before.
const server = new x402ResourceServer(facilitator).register("eip155:8453", new ExactEvmScheme());

const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /report": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:8453",
            payTo: PAY_TO,
          },
        ],
        description: "AI-generated report",
      },
    },
    server,
  ),
);

app.get("/report", (_req, res) => {
  res.json({ report: "..." });
});

app.listen(8402, () =>
  console.log(
    "Listening on http://localhost:8402\n" + `Receiving EVM payments at ${PAY_TO}`,
  ),
);
