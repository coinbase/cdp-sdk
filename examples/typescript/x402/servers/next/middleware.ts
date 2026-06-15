/**
 * Next.js middleware for x402 payment protection.
 *
 * This file protects page routes using createCdpPaymentProxy from @coinbase/x402-next.
 * Place this file at the root of your Next.js project (alongside package.json).
 *
 * Required environment variables:
 *   CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET — CDP API credentials
 *   PAY_TO                              — EVM address to receive payments
 */

import { createCdpPaymentProxy } from "@coinbase/x402-next";

if (!process.env.PAY_TO) {
  throw new Error("PAY_TO env var required (0x... EVM address)");
}
const PAY_TO = process.env.PAY_TO as `0x${string}`;

export default createCdpPaymentProxy({
  routes: {
    "/report": {
      accepts: {
        scheme: "exact",
        price: "$0.01",
        network: "eip155:8453",
        payTo: PAY_TO,
      },
      description: "AI-generated report",
    },
  },
});

export const config = {
  matcher: ["/report"],
};
