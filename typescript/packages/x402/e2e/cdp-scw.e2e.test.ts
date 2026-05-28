/**
 * End-to-end tests for CDP x402 payment flow using a Smart Contract Wallet (SCW).
 *
 * Tests exercise Smart Contract Wallet provisioning and real HTTP payment
 * against a local x402-protected resource server on Base Sepolia. The
 * resource server is backed by a CdpResourceServer (via createCdpResourceServer) with an
 * SCW receiver wallet, verifying the full SCW-to-SCW payment path.
 *
 * Required environment variables:
 *   - CDP_API_KEY_ID
 *   - CDP_API_KEY_SECRET
 *   - CDP_WALLET_SECRET
 *
 * The SCW owner account name is read from CDP_OWNER_ACCOUNT_NAME env var and
 * defaults to "x402-e2e-scw-owner". The SCW must hold enough USDC on Base
 * Sepolia to cover the payment.
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

const ownerAccountName = process.env.CDP_OWNER_ACCOUNT_NAME ?? "x402-e2e-scw-owner";
const hasRequiredCredentials = Boolean(
  process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET,
);
const describeWithCredentials = hasRequiredCredentials ? describe : describe.skip;

describeWithCredentials("CDP x402 E2E (SCW client, SCW receiver)", () => {
  let result: CdpX402ClientResult;
  let server: Server;
  let payToEvmAddress: `0x${string}`;

  beforeAll(async () => {
    result = await createCdpX402Client({
      walletConfig: {
        type: "cdp-smart",
        accountName: process.env.CDP_ACCOUNT_NAME ?? "x402-e2e-test",
        ownerAccountName,
      },
    });

    // CdpResourceServer provisions its own SCW receiver wallet — the server's
    // receiver is also a Smart Contract Wallet for this suite.
    ({ server, payToEvmAddress } = await startResourceServer({
      walletConfig: {
        type: "cdp-smart",
        accountName: "x402-e2e-scw-receiver",
        ownerAccountName: `${ownerAccountName}-receiver`,
      },
    }));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should provision a CDP Smart Contract Wallet", () => {
    expect(result.evmAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("should have the owner wallet name set", () => {
    expect(result.ownerWallet).toBeDefined();
    expect(typeof result.ownerWallet).toBe("string");
    expect((result.ownerWallet as string).length).toBeGreaterThan(0);
  });

  it("should have a configured x402 client", () => {
    expect(result.client).toBeDefined();
  });

  it("should wrap fetch with x402 payment handling", () => {
    const wrappedFetch = wrapFetchWithPayment(fetch, result.client);
    expect(wrappedFetch).toBeTypeOf("function");
  });

  it("resource server provisions a valid SCW receiver address", () => {
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
