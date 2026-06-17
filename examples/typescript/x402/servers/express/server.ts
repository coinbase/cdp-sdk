/**
 * Express resource server protected with x402 and the CDP facilitator.
 *
 * Uses `createCdpResourceServer()` to provision a receiver wallet automatically and
 * wire the CDP facilitator — no manual payTo address required. Routes are
 * specified in a simplified CDP-owned format; the server fills in wallet
 * addresses and registers EVM + Solana payment schemes by default.
 *
 * Required environment variables:
 *   CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET, CDP_SERVER_WALLET_SECRET — CDP API credentials
 *
 * Alternatively, store routes in a JSON file and pass `configPath`:
 *   createCdpResourceServer({ configPath: "./x402.config.json" })
 */

import express from "express";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";
import { createCdpResourceServer } from "@coinbase/cdp-sdk/x402";

// createCdpResourceServer provisions wallets, resolves routes, and syncs
// with the CDP facilitator. The returned CdpResourceServer extends
// x402HTTPResourceServer and can be passed directly to any middleware.
const server = await createCdpResourceServer({
  routes: {
    "GET /report": {
      price: "$0.01",
      description: "AI-generated report",
      // Defaults to Base mainnet + Solana mainnet when omitted.
      // Uncomment to restrict to specific networks:
      // networks: ["eip155:8453"],
    },
  },
});

const app = express();
// server IS an x402HTTPResourceServer — pass it directly.
app.use(paymentMiddlewareFromHTTPServer(server));

app.get("/report", (_req, res) => {
  res.json({ report: "..." });
});

app.listen(8402, () =>
  console.log(
    `Listening on http://localhost:8402\n` +
      `Receiving EVM payments at ${server.payToEvmAddress}\n` +
      `Receiving Solana payments at ${server.payToSvmAddress}`,
  ),
);
