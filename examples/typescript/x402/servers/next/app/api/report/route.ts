/**
 * Next.js App Router API route protected with x402 payment.
 *
 * Demonstrates using createCdpRouteHandler from @coinbase/x402-next/server,
 * which wraps a route handler so payment is settled after a successful response.
 *
 * Required environment variables:
 *   CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET — CDP API credentials
 *   PAY_TO                              — EVM address to receive payments
 */

import { createCdpRouteHandler } from "@coinbase/x402-next/server";
import { NextResponse } from "next/server";

if (!process.env.PAY_TO) {
  throw new Error("PAY_TO env var required (0x... EVM address)");
}
const PAY_TO = process.env.PAY_TO as `0x${string}`;

export const GET = createCdpRouteHandler(
  async () => {
    return NextResponse.json({ report: "..." });
  },
  {
    routeConfig: {
      accepts: {
        scheme: "exact",
        price: "$0.01",
        network: "eip155:8453",
        payTo: PAY_TO,
      },
      description: "AI-generated report",
    },
  },
);
