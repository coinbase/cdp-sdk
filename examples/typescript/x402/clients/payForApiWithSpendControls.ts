// Usage: pnpm tsx x402/clients/payForApiWithSpendControls.ts

/**
 * CDP Dev — Pay for an x402-protected API with per-payment and cumulative spend caps.
 *
 * `CdpX402Client` accepts a `spendControls` option that wires SDK-managed
 * spend guardrails on top of the CDP-managed wallet:
 *
 * - `maxAmountPerPayment`   — hard per-payment cap
 * - `maxCumulativeSpend`    — rolling spend cap
 * - `maxCumulativeSpendWindow` — rolling window duration
 * - `allowedNetworks`       — restrict to specific chains
 * - `allowedAssets`         — restrict to specific tokens
 * - `onApproachingLimit`    — callback when spend approaches the cap
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env
 *   Fund the wallet with USDC on Base Sepolia before running.
 */
import "dotenv/config";

import { CdpX402Client, wrapFetchWithPayment } from "@coinbase/cdp-sdk/x402";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const X402_PAID_API_URL = process.env.X402_API_URL ?? "https://x402.org/protected";

async function main() {
  const client = new CdpX402Client({
    spendControls: {
      // Hard cap: each payment must not exceed $0.01 USDC
      maxAmountPerPayment: { atomic: 10_000n, asset: USDC_BASE },
      // Rolling cap: $0.05 USDC total per 24 hours
      maxCumulativeSpend: { atomic: 50_000n, asset: USDC_BASE },
      maxCumulativeSpendWindow: "24h",
      // Only pay on Base mainnet
      allowedNetworks: ["eip155:8453"],
      // Notify when 80% or 95% of the rolling cap is consumed
      onApproachingLimit: (spent, limit) => {
        const pct = (Number(spent.atomic) / Number(limit.atomic)) * 100;
        console.warn(
          `[SpendControl] Approaching limit: ${pct.toFixed(0)}% of daily cap used`,
        );
      },
    },
  });

  // Initialization is lazy — wallet provisioned on first payment.
  const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);

  console.log(`Requesting (with spend controls): ${X402_PAID_API_URL}`);
  try {
    const response = await fetchWithPayment(X402_PAID_API_URL);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    const body = await response.json();
    console.log("Response:", JSON.stringify(body, null, 2));
  } catch (err) {
    if (err instanceof Error && err.message.includes("per_payment_cap")) {
      console.error("Payment blocked: exceeds per-payment cap.");
    } else if (err instanceof Error && err.message.includes("cumulative_cap")) {
      console.error("Payment blocked: cumulative spend cap reached.");
    } else if (err instanceof Error && err.message.includes("network_not_allowed")) {
      console.error("Payment blocked: network not in allowedNetworks.");
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
