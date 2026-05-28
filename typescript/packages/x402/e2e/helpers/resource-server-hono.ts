/**
 * Local x402-protected Hono resource server for e2e tests.
 *
 * Mirrors resource-server.ts but uses createCdpHonoMiddleware from
 * @coinbase/x402-hono, exercising the full Hono middleware integration
 * against the CDP hosted facilitator.
 *
 * The server is intended to be started in beforeAll and stopped in afterAll.
 */

import { type Server } from "node:http";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createCdpHonoMiddleware } from "@coinbase/x402-hono";

export const HONO_RESOURCE_SERVER_PORT = 4024;
export const HONO_RESOURCE_SERVER_URL = `http://localhost:${HONO_RESOURCE_SERVER_PORT}`;
export const PROTECTED_PATH = "/protected";
export const PAYMENT_PRICE = "$0.001";
export const PAYMENT_NETWORK = "eip155:84532" as `${string}:${string}`;

/**
 * Starts a local x402-protected Hono server using createCdpHonoMiddleware.
 *
 * The middleware syncs payment schemes with the CDP facilitator on the first
 * request, so no explicit initialize() call is required here.
 *
 * @param payTo - The EVM address that receives payments.
 * @returns The running HTTP server instance. Call server.close() to shut it down.
 */
export async function startHonoResourceServer(payTo: `0x${string}`): Promise<Server> {
  const app = new Hono();

  app.use(
    createCdpHonoMiddleware({
      routes: {
        [`GET ${PROTECTED_PATH}`]: {
          accepts: {
            scheme: "exact" as const,
            price: PAYMENT_PRICE,
            network: PAYMENT_NETWORK,
            payTo,
            maxTimeoutSeconds: 300,
          },
          description: "x402 e2e test endpoint (hono)",
        },
      },
    }),
  );

  app.get(PROTECTED_PATH, (c) => c.json({ message: "payment accepted" }));
  app.get("/health", (c) => c.json({ status: "ok" }));

  return new Promise<Server>((resolve, reject) => {
    const s = serve({ fetch: app.fetch, port: HONO_RESOURCE_SERVER_PORT }, () =>
      resolve(s as unknown as Server),
    );
    (s as unknown as Server).once("error", reject);
  });
}
