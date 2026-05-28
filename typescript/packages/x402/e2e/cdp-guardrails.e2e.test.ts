/**
 * End-to-end tests for CDP x402 guardrails — spend controls and pre-flight
 * balance check.
 *
 * Spin up a local Express resource server and verify that:
 *
 * 1. A payment within a generous cumulative cap succeeds.
 * 2. A second payment that would exceed a tight cumulative cap is blocked
 *    locally (SpendControlError with code "cumulative_cap").
 * 3. An unfunded CDP wallet is rejected immediately by the pre-flight balance
 *    check with InsufficientFundsError across all supported networks (Base
 *    Sepolia, Solana devnet, Polygon, Base mainnet, Arbitrum, World Chain,
 *    World Chain Sepolia, Solana mainnet).
 *
 * Required environment variables:
 *   - CDP_API_KEY_ID
 *   - CDP_API_KEY_SECRET
 *   - CDP_WALLET_SECRET
 *
 * Tests 1+2 additionally require a CDP wallet (default account "x402-e2e-test")
 * funded with USDC on Base Sepolia.
 *
 * Run with:
 *   pnpm test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type Server } from "node:http";
import {
  createCdpX402Client,
  InsufficientFundsError,
  applySpendControls,
  createBalanceCheckHook,
  wrapFetchWithPayment,
} from "@coinbase/x402";
import type { CdpX402ClientResult } from "@coinbase/x402";
import { x402HTTPClient } from "@x402/core/client";
import {
  startResourceServer,
  RESOURCE_SERVER_URL,
  PROTECTED_PATH,
} from "../helpers/resource-server.js";

const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
const USDC_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDC_POLYGON = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDC_WORLD = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
const USDC_WORLD_SEPOLIA = "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88";
const USDC_SOLANA_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const hasRequiredCredentials = Boolean(
  process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET,
);

// ---------------------------------------------------------------------------
// Spend-controls guardrail e2e
// ---------------------------------------------------------------------------
describe("CDP x402 E2E — spend controls guardrail", () => {
  let server: Server;
  let funded: CdpX402ClientResult;

  beforeAll(async () => {
    if (!hasRequiredCredentials) {
      throw new Error(
        "Missing required env vars: CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET must all be set",
      );
    }
    funded = await createCdpX402Client({
      walletConfig: { accountName: process.env.CDP_ACCOUNT_NAME ?? "x402-e2e-test" },
      // Disable balance check so spend-controls tests are isolated from it.
      disablePreflightBalanceCheck: true,
    });
    ({ server } = await startResourceServer());
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("passes a payment that is within the cumulative cap", async () => {
    applySpendControls(funded.client, {
      maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC_BASE_SEPOLIA },
      maxCumulativeSpendWindow: "24h",
    });
    const fetchWithPayment = wrapFetchWithPayment(fetch, funded.client);
    const response = await fetchWithPayment(`${RESOURCE_SERVER_URL}${PROTECTED_PATH}`);
    expect(response.status).toBe(200);
  });

  it("blocks a second payment that exceeds a tight cumulative cap", async () => {
    const capped = await createCdpX402Client({
      walletConfig: { accountName: process.env.CDP_ACCOUNT_NAME ?? "x402-e2e-test" },
      disablePreflightBalanceCheck: true,
    });

    // Cap exactly one payment's worth ($0.001 USDC = 1_000 atomic units).
    // First payment: 0 + 1_000 <= 1_000 → allowed.
    // Second payment: 1_000 + 1_000 > 1_000 → rejected locally.
    applySpendControls(capped.client, {
      maxCumulativeSpend: { atomic: 1_000n, asset: USDC_BASE_SEPOLIA },
      maxCumulativeSpendWindow: "24h",
    });

    const fetchWithPayment = wrapFetchWithPayment(fetch, capped.client);

    const first = await fetchWithPayment(`${RESOURCE_SERVER_URL}${PROTECTED_PATH}`);
    expect(first.status).toBe(200);

    // wrapFetchWithPayment re-wraps the SpendControlError as a plain Error whose
    // message starts with "Failed to create payment payload: <original message>".
    // Match on text present in the underlying SpendControlError message.
    await expect(fetchWithPayment(`${RESOURCE_SERVER_URL}${PROTECTED_PATH}`)).rejects.toThrow(
      "cumulative spend",
    );
  });
});

// ---------------------------------------------------------------------------
// Pre-flight balance check e2e — unfunded wallet (all supported networks)
// ---------------------------------------------------------------------------
describe("CDP x402 E2E — pre-flight balance check", () => {
  let server: Server;
  let empty: CdpX402ClientResult;

  beforeAll(async () => {
    if (!hasRequiredCredentials) {
      throw new Error(
        "Missing required env vars: CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET must all be set",
      );
    }
    // Deterministically empty account — must never be funded.
    empty = await createCdpX402Client({
      walletConfig: { accountName: "x402-e2e-balance-check-empty" },
    });
    ({ server } = await startResourceServer());
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeHookContext(network: string, asset: string, amount = "1000000"): any {
    return {
      selectedRequirements: {
        network,
        asset,
        amount,
        scheme: "exact",
        payTo: "0xpayee",
        maxTimeoutSeconds: 60,
        extra: {},
      },
      paymentRequired: {},
    };
  }

  it("raises InsufficientFundsError for unfunded EVM wallet (Base Sepolia, CDP indexed)", async () => {
    // Use the resource server 402 response to exercise the full createPaymentPayload path.
    const probe = await fetch(`${RESOURCE_SERVER_URL}${PROTECTED_PATH}`);
    expect(probe.status).toBe(402);

    const httpClient = new x402HTTPClient(empty.client);
    const getHeader = (name: string) => probe.headers.get(name);
    let body: unknown;
    try {
      body = await probe.clone().json();
    } catch {
      // ignore
    }
    const paymentRequired = httpClient.getPaymentRequiredResponse(getHeader, body);
    const err = await empty.client.createPaymentPayload(paymentRequired).catch((e: unknown) => e);

    expect(err, "expected InsufficientFundsError").toBeInstanceOf(InsufficientFundsError);
    const insufficientErr = err as InsufficientFundsError;
    expect(insufficientErr.available).toBe(0n);
    expect(insufficientErr.required).toBeGreaterThan(0n);
    expect(insufficientErr.address.toLowerCase()).toBe(empty.evmAddress.toLowerCase());
  });

  it.each([
    {
      label: "Solana devnet (CDP indexed)",
      network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      asset: USDC_SOLANA_DEVNET,
      addressType: "svm" as const,
    },
    {
      label: "Polygon (on-chain balanceOf fallback)",
      network: "eip155:137",
      asset: USDC_POLYGON,
      addressType: "evm" as const,
    },
    {
      label: "Base mainnet (CDP indexed)",
      network: "eip155:8453",
      asset: USDC_BASE_MAINNET,
      addressType: "evm" as const,
    },
    {
      label: "Arbitrum (on-chain balanceOf fallback)",
      network: "eip155:42161",
      asset: USDC_ARBITRUM,
      addressType: "evm" as const,
    },
    {
      label: "World Chain (on-chain balanceOf fallback)",
      network: "eip155:480",
      asset: USDC_WORLD,
      addressType: "evm" as const,
    },
    {
      label: "World Chain Sepolia (on-chain balanceOf fallback)",
      network: "eip155:4801",
      asset: USDC_WORLD_SEPOLIA,
      addressType: "evm" as const,
    },
    {
      label: "Solana mainnet (CDP indexed)",
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      asset: USDC_SOLANA_MAINNET,
      addressType: "svm" as const,
    },
  ])(
    "raises InsufficientFundsError for unfunded wallet — $label",
    async ({ network, asset, addressType }) => {
      const hook = createBalanceCheckHook({
        cdpClient: empty.cdpClient,
        evmAddress: empty.evmAddress,
        svmAddress: empty.svmAddress,
        onWarning: () => {},
      });
      const err = await hook(makeHookContext(network, asset)).catch((e: unknown) => e);

      expect(err, "expected InsufficientFundsError").toBeInstanceOf(InsufficientFundsError);
      const insufficientErr = err as InsufficientFundsError;
      expect(insufficientErr.available).toBe(0n);
      expect(insufficientErr.required).toBeGreaterThan(0n);
      if (addressType === "svm") {
        expect(insufficientErr.address).toBe(empty.svmAddress);
      } else {
        expect(insufficientErr.address.toLowerCase()).toBe(empty.evmAddress.toLowerCase());
      }
    },
  );
});
