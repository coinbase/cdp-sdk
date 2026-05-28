/**
 * Hono resource server protected with x402 and the CDP facilitator.
 *
 * Demonstrates using createCdpHonoMiddleware from @coinbase/x402-hono,
 * which automatically configures the CDP facilitator and registers default
 * payment schemes (ExactEvm + UptoEvm on Base, ExactSvm on Solana).
 *
 * Required environment variables:
 *   CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET — CDP API credentials
 *   PAY_TO                              — EVM address to receive payments
 *
 * Run:
 *   pnpm install
 *   PAY_TO=0x... pnpm start
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createCdpHonoMiddleware } from "@coinbase/x402-hono";
import "dotenv/config";

const PAY_TO = (process.env.PAY_TO ?? "") as `0x${string}`;
if (!PAY_TO) throw new Error("PAY_TO env var required (0x... EVM address)");

const app = new Hono();

app.use(
  createCdpHonoMiddleware({
    routes: {
      "GET /report": {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: "eip155:8453",
          payTo: PAY_TO,
        },
        description: "AI-generated report",
      },
    },
  }),
);

app.get("/report", (c) => {
  return c.json({ report: "..." });
});

serve({ fetch: app.fetch, port: 8402 }, () =>
  console.log("Listening on http://localhost:8402"),
);
