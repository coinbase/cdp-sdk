/**
 * Local x402-protected Next.js-style resource server for e2e tests.
 *
 * Uses createCdpRouteHandler from @coinbase/x402-next/server to wrap an App
 * Router-style route handler, then adapts it to a plain Node.js HTTP server
 * for testing without a full Next.js runtime. This directly exercises the
 * public @coinbase/x402-next integration.
 *
 * The server is intended to be started in beforeAll and stopped in afterAll.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { NextRequest, NextResponse } from "next/server";
import { createCdpRouteHandler } from "@coinbase/x402-next/server";

export const NEXT_RESOURCE_SERVER_PORT = 4025;
export const NEXT_RESOURCE_SERVER_URL = `http://localhost:${NEXT_RESOURCE_SERVER_PORT}`;
export const PROTECTED_PATH = "/protected";
export const PAYMENT_PRICE = "$0.001";
export const PAYMENT_NETWORK = "eip155:84532" as `${string}:${string}`;

/**
 * Converts a Node.js IncomingMessage to a NextRequest for use with @x402/next.
 *
 * Only copies headers; body is omitted since e2e payment requests use GET
 * with the Payment-Payload header rather than a request body.
 */
function toNextRequest(req: IncomingMessage): NextRequest {
  const url = new URL(req.url ?? "/", `http://localhost:${NEXT_RESOURCE_SERVER_PORT}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }
  return new NextRequest(url, { method: req.method ?? "GET", headers });
}

/**
 * Writes a NextResponse back to a Node.js ServerResponse.
 */
async function sendNextResponse(nextRes: NextResponse, res: ServerResponse): Promise<void> {
  const nodeHeaders: Record<string, string> = {};
  nextRes.headers.forEach((value, key) => {
    nodeHeaders[key] = value;
  });
  const body = await nextRes.arrayBuffer();
  res.writeHead(nextRes.status, nodeHeaders);
  res.end(Buffer.from(body));
}

/**
 * Starts a local x402-protected server backed by createCdpRouteHandler.
 *
 * @param payTo - The EVM address that receives payments.
 * @returns The running HTTP server instance. Call server.close() to shut it down.
 */
export async function startNextResourceServer(payTo: `0x${string}`): Promise<Server> {
  const protectedHandler = createCdpRouteHandler(
    async (): Promise<NextResponse<unknown>> => NextResponse.json({ message: "payment accepted" }),
    {
      routeConfig: {
        accepts: {
          scheme: "exact",
          price: PAYMENT_PRICE,
          network: PAYMENT_NETWORK,
          payTo,
          maxTimeoutSeconds: 300,
        },
        description: "x402 e2e test endpoint (next)",
      },
    },
  );

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const nextReq = toNextRequest(req);
      const { pathname } = nextReq.nextUrl;

      let nextRes: NextResponse<unknown>;
      if (pathname === "/health") {
        nextRes = NextResponse.json({ status: "ok" });
      } else if (pathname === PROTECTED_PATH) {
        nextRes = (await protectedHandler(nextReq, {})) as NextResponse<unknown>;
      } else {
        nextRes = new NextResponse("Not Found", { status: 404 });
      }

      await sendNextResponse(nextRes, res);
    } catch (err) {
      console.error("[next-resource-server] unhandled error:", err);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(NEXT_RESOURCE_SERVER_PORT, resolve);
    server.once("error", reject);
  });

  return server;
}
