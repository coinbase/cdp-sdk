/**
 * Local x402-protected resource server for e2e tests.
 *
 * Spins up an Express server backed by a `CdpResourceServer` created via
 * `createCdpResourceServer()`, which provisions its own EVM EOA/SCW and Solana
 * receiver wallets and wires the CDP hosted facilitator for payment
 * verification and settlement.
 *
 * The server exposes a single paid endpoint at GET /protected (accepting
 * both EVM and Solana payments) and a free health-check at GET /health.
 *
 * All CDP credentials are read from environment variables by default.
 *
 * The server is intended to be started in beforeAll and stopped in afterAll.
 */

import express from "express";
import { createServer, type Server } from "node:http";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";
import { createCdpResourceServer } from "@coinbase/x402";
import type { CdpResourceServerConfig } from "@coinbase/x402";

export const RESOURCE_SERVER_PORT = 4021;
export const RESOURCE_SERVER_URL = `http://localhost:${RESOURCE_SERVER_PORT}`;
export const PROTECTED_PATH = "/protected";
export const PAYMENT_PRICE = "$0.001";
export const EVM_NETWORK = "eip155:84532" as const;
export const SVM_NETWORK = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;

/** @deprecated Use EVM_NETWORK. Retained for backward compatibility. */
export const PAYMENT_NETWORK = EVM_NETWORK;

const ROUTES: CdpResourceServerConfig["routes"] = {
  [`GET ${PROTECTED_PATH}`]: {
    price: PAYMENT_PRICE,
    description: "x402 e2e test endpoint",
    // Testnet networks: Base Sepolia (EVM) + Solana devnet.
    // Use explicit networks so e2e tests hit testnets rather than the mainnet defaults.
    networks: [EVM_NETWORK, SVM_NETWORK],
  },
};

/**
 * Starts a local x402-protected Express server backed by `createCdpResourceServer()`.
 *
 * The server provisions its own EVM and Solana receiver wallets. Pass
 * `serverConfig` to override wallet type or account names — for example,
 * `walletConfig: { type: "cdp-smart" }` for an SCW receiver.
 *
 * @param serverConfig - Optional config overrides (all fields except `routes`,
 *                       which are fixed to the e2e test routes).
 *                       Defaults to reading all credentials from env vars.
 * @returns The running HTTP server and the provisioned receiver addresses.
 */
export async function startResourceServer(
  serverConfig?: Omit<CdpResourceServerConfig, "routes">,
): Promise<{
  server: Server;
  payToEvmAddress: `0x${string}`;
  payToSvmAddress: string;
}> {
  // Provisions wallets, resolves routes, and syncs supported schemes with
  // the CDP facilitator before the server starts accepting requests.
  const cdpServer = await createCdpResourceServer({ ...serverConfig, routes: ROUTES });

  const app = express();

  // cdpServer IS an x402HTTPResourceServer — pass it directly.
  app.use(paymentMiddlewareFromHTTPServer(cdpServer, undefined, undefined, false));

  app.get(PROTECTED_PATH, (_req, res) => {
    res.json({ message: "payment accepted" });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[resource-server] unhandled error:", err);
      res.status(500).json({ error: err.message });
    },
  );

  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.listen(RESOURCE_SERVER_PORT, resolve);
    server.once("error", reject);
  });

  return {
    server,
    payToEvmAddress: cdpServer.payToEvmAddress,
    payToSvmAddress: cdpServer.payToSvmAddress,
  };
}
