// Usage: pnpm start (see ../../README.md for the full APPROACH matrix)
//   APPROACH=1 PAY_TO=0x... pnpm start   drop-in facilitator swap
//   APPROACH=2 pnpm start                 inline route config (default)
//   APPROACH=3 pnpm start                 config file (x402.config.json)
import { config } from "dotenv";

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
import {
  createCdpFacilitatorClient,
  createX402Server,
} from "@coinbase/cdp-sdk/x402";

const APPROACH = process.env.APPROACH ?? "2";
const PORT = Number(process.env.PORT ?? 8402);
const app = express();

if (APPROACH === "1") {
  // Drop the CDP facilitator into an existing x402ResourceServer / paymentMiddleware setup.
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

  app.get("/report", (_req, res) => res.json({ report: "..." }));
  app.listen(PORT, () =>
    console.log(
      `Listening on http://localhost:${PORT}\nReceiving EVM payments at ${PAY_TO}`,
    ),
  );
} else if (APPROACH === "2") {
  // Solana `upto` is opt-in: the CDP-hosted facilitator doesn't advertise it yet, so registering
  // it unconditionally would fail this server's startup validation.
  const ENABLE_SOLANA_UPTO = process.env.X402_ENABLE_SOLANA_UPTO === "true";

  const server = await createX402Server({
    environment: "development", // Base Sepolia + Solana Devnet; "production" for mainnet
    routes: {
      "GET /report": { price: "$0.01", description: "AI-generated report" },
      "GET /usage": {
        price: "$0.10",
        scheme: "upto",
        description:
          "Usage-based billing — authorize up to $0.10, settle actual usage",
      },
      ...(ENABLE_SOLANA_UPTO && {
        "GET /usage-solana": {
          price: "$0.10",
          scheme: "upto",
          networks: ["solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"],
          description:
            "Usage-based billing on Solana — authorize up to $0.10, settle actual usage",
        },
      }),
    },
  });

  app.use(paymentMiddlewareFromHTTPServer(server));
  app.get("/report", (_req, res) => res.json({ report: "..." }));

  // Settles a random amount at or below the route's authorized max, via setSettlementOverrides.
  function handleUsageRequest(res: express.Response, resultLabel: string) {
    const maxAtomic = 100_000; // $0.10 in 6-decimal USDC atomic units
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

  // Smoke test only: createX402Server never registers auth-capture server-side (client-only
  // upstream today). Hand-builds a 402, then returns 501 once a signed payload arrives.
  const AUTH_CAPTURE_USDC_BASE_SEPOLIA =
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

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
      .set(
        "PAYMENT-REQUIRED",
        Buffer.from(JSON.stringify(paymentRequired)).toString("base64"),
      )
      .json(paymentRequired);
  });

  app.listen(PORT, () =>
    console.log(
      `Listening on http://localhost:${PORT}\n` +
        `Receiving EVM payments at ${server.payToEvmAddress}\n` +
        `Receiving Solana payments at ${server.payToSvmAddress}`,
    ),
  );
} else if (APPROACH === "3") {
  // Routes (and optionally credentials) load from ./x402.config.json; inline config wins on conflicts.
  const server = await createX402Server({ configPath: "./x402.config.json" });

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
  throw new Error(
    `Unknown APPROACH "${APPROACH}" — set APPROACH to 1, 2, or 3.`,
  );
}
