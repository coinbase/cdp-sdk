/**
 * End-to-end tests for the Express CDP middleware (createCdpExpressMiddleware).
 *
 * Validates that a resource server built with @coinbase/x402-express correctly
 * issues 402 challenges and accepts valid x402 payments from a CDP wallet on
 * Base Sepolia. Requires CDP credentials in the environment:
 *   - CDP_API_KEY_ID
 *   - CDP_API_KEY_SECRET
 *   - CDP_WALLET_SECRET
 *
 * The test wallet must hold enough USDC on Base Sepolia to cover the payment.
 *
 * Run with:
 *   pnpm test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type Server } from "node:http";
import { createCdpX402Client, wrapFetchWithPayment } from "@coinbase/x402";
import type { CdpX402ClientResult } from "@coinbase/x402";
import {
  startCdpExpressResourceServer,
  CDP_EXPRESS_RESOURCE_SERVER_URL,
  PROTECTED_PATH,
} from "../helpers/resource-server-cdp-express.js";

const hasRequiredCredentials = Boolean(
  process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET,
);
const describeWithCredentials = hasRequiredCredentials ? describe : describe.skip;

describeWithCredentials("Express middleware x402 E2E", () => {
  let result: CdpX402ClientResult;
  let server: Server;

  beforeAll(async () => {
    result = await createCdpX402Client({
      walletConfig: {
        accountName: process.env.CDP_ACCOUNT_NAME ?? "x402-e2e-test",
      },
    });

    // Use a dedicated payTo account so that payments aren't self-transfers.
    // Self-payment (from == to) is rejected by the CDP facilitator.
    const payToAccount = await result.cdpClient.evm.getOrCreateAccount({
      name: (process.env.CDP_ACCOUNT_NAME ?? "x402-e2e-test") + "-receiver",
    });
    server = await startCdpExpressResourceServer(payToAccount.address as `0x${string}`);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should return 200 for the health endpoint", async () => {
    const response = await fetch(`${CDP_EXPRESS_RESOURCE_SERVER_URL}/health`);
    expect(response.status).toBe(200);
  });

  it("should return 402 for an unauthenticated request to the protected endpoint", async () => {
    const response = await fetch(`${CDP_EXPRESS_RESOURCE_SERVER_URL}${PROTECTED_PATH}`);
    expect(response.status).toBe(402);
  });

  it("should complete a real x402 payment on Base Sepolia via Express middleware", async () => {
    const wrappedFetch = wrapFetchWithPayment(fetch, result.client);
    const response = await wrappedFetch(`${CDP_EXPRESS_RESOURCE_SERVER_URL}${PROTECTED_PATH}`);
    const body = await response.json().catch(() => null);
    expect(response.status, `Payment failed: ${JSON.stringify(body)}`).toBe(200);
    expect(body).toMatchObject({ message: "payment accepted" });
  });
});
