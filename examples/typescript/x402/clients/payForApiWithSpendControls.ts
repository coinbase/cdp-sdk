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

import { CdpX402Client, SpendControlError } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";

const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
const X402_PAID_API_URL = process.env.X402_API_URL ?? "https://x402.org/protected";

async function main() {
  const client = new CdpX402Client({
    spendControls: {
      // Hard cap: each payment must not exceed $0.01 USDC
      maxAmountPerPayment: { atomic: 10_000n, asset: USDC_BASE_SEPOLIA },
      // Rolling cap: $0.05 USDC total per 24 hours
      maxCumulativeSpend: { atomic: 50_000n, asset: USDC_BASE_SEPOLIA },
      maxCumulativeSpendWindow: "24h",
      // Only pay on Base Sepolia
      allowedNetworks: ["eip155:84532"],
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
    // Spend controls reject a payment by throwing a SpendControlError with a
    // machine-readable `code` — switch on that rather than matching message text.
    if (err instanceof SpendControlError) {
      switch (err.code) {
        case "per_payment_cap":
          console.error("Payment blocked: exceeds per-payment cap.");
          break;
        case "cumulative_cap":
          console.error("Payment blocked: cumulative spend cap reached.");
          break;
        case "network_not_allowed":
          console.error("Payment blocked: network not in allowedNetworks.");
          break;
        default:
          console.error(`Payment blocked by spend controls: ${err.code}`);
      }
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
