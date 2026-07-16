import { NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { NETWORK, payTo, server } from "../../x402";

/**
 * The protected handler. It only runs after payment is verified, and the
 * payment is settled only if this returns a successful response (status < 400).
 *
 * @returns The AI-generated report.
 */
const handler = async () => NextResponse.json({ report: "..." });

// withX402 gates this route with x402. The CDP facilitator (wired in ../../x402)
// verifies and settles the payment — no other change from a self-hosted setup.
export const GET = withX402(
  handler,
  {
    accepts: [{ scheme: "exact", price: "$0.01", network: NETWORK, payTo }],
    description: "AI-generated report",
  },
  server,
);
