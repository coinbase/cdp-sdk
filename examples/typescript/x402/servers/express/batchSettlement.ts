// Usage: PAY_TO=0x... pnpm start:batch-settlement

/**
 * Express resource server protected by the `batch-settlement` EVM scheme,
 * delegating the receiver-authorizer role to the CDP hosted facilitator.
 *
 * `batch-settlement` opens an off-chain voucher channel on the first request
 * (a "deposit") and settles subsequent requests against that channel without
 * further onchain transactions — see the scheme's spec for the full protocol.
 *
 * `createX402Server` deliberately doesn't register this scheme server-side
 * yet (see the CDP SDK's README), so this wires `@x402/evm`'s
 * `BatchSettlementEvmScheme` directly against `createCdpFacilitatorClient()`,
 * the same "Approach 1" pattern as `server.ts`. Because the CDP facilitator
 * already advertises a `receiverAuthorizer` for `batch-settlement` on Base
 * Sepolia (see `GET /supported`), no local receiver-authorizer key is
 * needed — the facilitator signs claims/refunds on the server's behalf. This
 * is simpler than x402's own `examples/typescript/servers/batch-settlement`
 * demo, which needs a separately-run facilitator funded with Base Sepolia ETH
 * for gas.
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, PAY_TO (an EVM address
 * *different* from the paying client's address — the scheme rejects a
 * channel where payer and receiver are the same address).
 */
import { config } from "dotenv";

config({ path: [".env", "../../../.env"] });

import express from "express";
import type { Address } from "viem";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/server";
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/express";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";

const NETWORK = "eip155:84532" as const;
const PORT = Number(process.env.PORT ?? 8404);

const PAY_TO = process.env.PAY_TO as Address;
if (!PAY_TO) throw new Error("PAY_TO env var required (an EVM address to receive payments)");

const facilitator = createCdpFacilitatorClient();
// No receiverAuthorizerSigner -> delegates authorization to the facilitator's
// advertised receiverAuthorizer (see the scheme's server README for the
// self-managed alternative).
const batchedScheme = new BatchSettlementEvmScheme(PAY_TO);
const resourceServer = new x402ResourceServer(facilitator).register(NETWORK, batchedScheme);

const httpServer = new x402HTTPResourceServer(resourceServer, {
  "GET /report": {
    accepts: {
      scheme: "batch-settlement",
      price: "$0.01",
      network: NETWORK,
      payTo: PAY_TO,
    },
    description: "AI-generated report",
  },
});

async function main() {
  // Fails fast if the facilitator doesn't support batch-settlement on this network.
  await httpServer.initialize();

  const app = express();
  app.use(paymentMiddlewareFromHTTPServer(httpServer));
  app.get("/report", (_req, res) => res.json({ report: "..." }));
  app.listen(PORT, () =>
    console.log(
      `Listening on http://localhost:${PORT}\nReceiving batch-settlement payments at ${PAY_TO}`,
    ),
  );
}

main().catch(err => {
  console.error("Startup failed:", err);
  process.exit(1);
});
