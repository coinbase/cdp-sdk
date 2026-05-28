/**
 * Local x402-protected Express resource server for e2e tests using the
 * high-level createCdpExpressMiddleware API.
 *
 * Complements resource-server.ts (which uses the low-level
 * paymentMiddlewareFromHTTPServer) by exercising the createCdpExpressMiddleware
 * entrypoint from @coinbase/x402-express, which internally configures the CDP
 * facilitator and registers default payment schemes.
 *
 * The server is intended to be started in beforeAll and stopped in afterAll.
 */

import express from "express";
import { createServer, type Server } from "node:http";
import { createCdpExpressMiddleware } from "@coinbase/x402-express";

export const CDP_EXPRESS_RESOURCE_SERVER_PORT = 4026;
export const CDP_EXPRESS_RESOURCE_SERVER_URL = `http://localhost:${CDP_EXPRESS_RESOURCE_SERVER_PORT}`;
export const PROTECTED_PATH = "/protected";
export const PAYMENT_PRICE = "$0.001";
export const PAYMENT_NETWORK = "eip155:84532" as `${string}:${string}`;

/**
 * Starts a local x402-protected Express server using createCdpExpressMiddleware.
 *
 * The middleware syncs payment schemes with the CDP facilitator on the first
 * request, so no explicit initialize() call is required here.
 *
 * @param payTo - The EVM address that receives payments.
 * @returns The running HTTP server instance. Call server.close() to shut it down.
 */
export async function startCdpExpressResourceServer(payTo: `0x${string}`): Promise<Server> {
  const app = express();

  app.use(
    createCdpExpressMiddleware({
      routes: {
        [`GET ${PROTECTED_PATH}`]: {
          accepts: {
            scheme: "exact" as const,
            price: PAYMENT_PRICE,
            network: PAYMENT_NETWORK,
            payTo,
            maxTimeoutSeconds: 300,
          },
          description: "x402 e2e test endpoint (cdp-express)",
        },
      },
    }),
  );

  app.get(PROTECTED_PATH, (_req, res) => {
    res.json({ message: "payment accepted" });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[cdp-express-resource-server] unhandled error:", err);
      res.status(500).json({ error: err.message });
    },
  );

  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.listen(CDP_EXPRESS_RESOURCE_SERVER_PORT, resolve);
    server.once("error", reject);
  });

  return server;
}
