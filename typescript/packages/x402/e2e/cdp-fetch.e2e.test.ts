/**
 * End-to-end tests for CDP x402 payment flow using a CDP Server Wallet (EOA).
 *
 * Tests exercise account provisioning and real HTTP payment against a local
 * x402-protected resource server on Base Sepolia. The resource server is
 * backed by a CdpResourceServer (via createCdpResourceServer) that provisions its own EOA receiver wallet.
 *
 * Required environment variables:
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
  startResourceServer,
  RESOURCE_SERVER_URL,
  PROTECTED_PATH,
} from "../helpers/resource-server.js";

const hasRequiredCredentials = Boolean(
  process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET,
);
const describeWithCredentials = hasRequiredCredentials ? describe : describe.skip;

describeWithCredentials("CDP x402 E2E (EOA client, EOA receiver)", () => {
  let result: CdpX402ClientResult;
  let server: Server;
  let payToEvmAddress: `0x${string}`;

  beforeAll(async () => {
    result = await createCdpX402Client({
      walletConfig: {
        accountName: process.env.CDP_ACCOUNT_NAME ?? "x402-e2e-test",
      },
    });

    // CdpResourceServer provisions its own dedicated receiver wallet so that
    // payer and receiver are always distinct accounts.
    ({ server, payToEvmAddress } = await startResourceServer());
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should provision a CDP EVM account", () => {
    expect(result.evmAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("should have a configured x402 client", () => {
    expect(result.client).toBeDefined();
  });

  it("should not set an owner wallet for an EOA wallet", () => {
    expect(result.ownerWallet).toBeUndefined();
  });

  it("should wrap fetch with x402 payment handling", () => {
    const wrappedFetch = wrapFetchWithPayment(fetch, result.client);
    expect(wrappedFetch).toBeTypeOf("function");
  });

  it("resource server provisions a valid EVM receiver address", () => {
    expect(payToEvmAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("should complete a real x402 payment on Base Sepolia", async () => {
    const wrappedFetch = wrapFetchWithPayment(fetch, result.client);
    const response = await wrappedFetch(`${RESOURCE_SERVER_URL}${PROTECTED_PATH}`);
    const body = await response.json().catch(() => null);
    expect(response.status, `Payment failed: ${JSON.stringify(body)}`).toBe(200);
    expect(body).toMatchObject({ message: "payment accepted" });
  });
});
