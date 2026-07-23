// Usage: pnpm start

/**
 * Bazaar-discoverable x402 server using the CDP SDK.
 *
 * `createX402Server` auto-injects an `extensions.bazaar` discovery declaration
 * for every "METHOD /path" route, so anything it serves becomes discoverable in
 * the CDP Bazaar once it settles a payment through the CDP facilitator — no extra
 * wiring. Routes here are loaded from ./x402.config.json;
 * ../express/x402.config.schema.json documents every supported field.
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 *   (+ x402.config.json in this directory)
 *
 * Run:
 *   pnpm install
 *   pnpm start
 */
import "dotenv/config";

import express from "express";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";
import { createX402Server } from "@coinbase/cdp-sdk/x402";

// Routes come from the JSON config file. Prefer inline config? Pass `routes`
// here instead — inline routes win on conflicting keys, and each route can carry
// richer discovery metadata via `extensions` (see declareDiscoveryExtension from
// @x402/extensions/bazaar):
//   routes: { "GET /weather/:city": { price: "$0.01", description: "..." } }
const server = await createX402Server({ configPath: "./x402.config.json" });

const app = express();
app.use(paymentMiddlewareFromHTTPServer(server));

app.get("/weather/:city", (req, res) => {
  const conditions: Record<string, { weather: string; temperature: number }> = {
    "san-francisco": { weather: "foggy", temperature: 60 },
    "new-york": { weather: "cloudy", temperature: 55 },
    tokyo: { weather: "rainy", temperature: 65 },
  };
  const data = conditions[req.params.city] ?? {
    weather: "sunny",
    temperature: 70,
  };
  res.json({ city: req.params.city, ...data });
});

app.listen(8402, () =>
  console.log(
    `Listening on http://localhost:8402\n` +
      `Receiving EVM payments at ${server.payToEvmAddress}\n` +
      `Receiving Solana payments at ${server.payToSvmAddress}`,
  ),
);
