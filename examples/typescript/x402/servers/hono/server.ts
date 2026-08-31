// Usage: pnpm start (Hono twin of the Express example — see ../express/server.ts and ../../README.md)
//   APPROACH=1 PAY_TO=0x... pnpm start   drop-in facilitator swap
//   APPROACH=2 pnpm start                 inline route config (default)
import { config } from "dotenv";

config({ path: [".env", "../../../.env"] });

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Address } from "viem";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  paymentMiddleware,
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
} from "@x402/hono";
import {
  createCdpFacilitatorClient,
  createX402Server,
} from "@coinbase/cdp-sdk/x402";

const APPROACH = process.env.APPROACH ?? "2";
const PORT = Number(process.env.PORT ?? 8402);
const app = new Hono();

if (APPROACH === "1") {
  const PAY_TO = (process.env.PAY_TO ?? "") as Address;
  if (!PAY_TO)
    throw new Error(
      "PAY_TO env var required (an EVM address to receive payments)",
    );

  const facilitator = createCdpFacilitatorClient();
  const server = new x402ResourceServer(facilitator).register(
    "eip155:84532",
    new ExactEvmScheme(),
  );

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

  app.get("/report", (c) => c.json({ report: "..." }));
  serve({ fetch: app.fetch, port: PORT }, () =>
    console.log(
      `Listening on http://localhost:${PORT}\nReceiving EVM payments at ${PAY_TO}`,
    ),
  );
} else {
  const server = await createX402Server({
    environment: "development", // Base Sepolia + Solana Devnet; "production" for mainnet
    routes: {
      "GET /report": { price: "$0.01", description: "AI-generated report" },
    },
  });

  app.use(paymentMiddlewareFromHTTPServer(server));
  app.get("/report", (c) => c.json({ report: "..." }));
  serve({ fetch: app.fetch, port: PORT }, () =>
    console.log(
      `Listening on http://localhost:${PORT}\n` +
        `Receiving EVM payments at ${server.payToEvmAddress}\n` +
        `Receiving Solana payments at ${server.payToSvmAddress}`,
    ),
  );
}
