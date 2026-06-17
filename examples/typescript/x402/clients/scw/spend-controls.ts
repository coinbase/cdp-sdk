// Usage: pnpm tsx x402/clients/scw/spend-controls.ts
//
// Demonstrates wiring per-payment + cumulative spend caps, an asset allowlist,
// and an approaching-limit notifier via createCdpX402Client's spendControls option.

import {
  createCdpX402Client,
  SpendControlError,
  wrapFetchWithPayment,
  type SpendControls,
} from "@coinbase/cdp-sdk/x402";
import "dotenv/config";

const baseURL = process.env.RESOURCE_SERVER_URL ?? "http://localhost:8402";
const endpointPath = process.env.ENDPOINT_PATH ?? "/report";
const url = `${baseURL}${endpointPath}`;

// USDC on Base Sepolia.
const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

const spendControls: SpendControls = {
  // Cap: 0.01 USDC per individual payment (USDC has 6 decimals).
  maxAmountPerPayment: { atomic: 10_000n, asset: USDC_BASE_SEPOLIA },

  // Cap: 0.05 USDC per rolling 24h window.
  maxCumulativeSpend: { atomic: 50_000n, asset: USDC_BASE_SEPOLIA },
  maxCumulativeSpendWindow: "24h",

  // Restrict to Base Sepolia + USDC only.
  allowedNetworks: ["eip155:84532"],
  allowedAssets: [USDC_BASE_SEPOLIA],

  // Notifier fires once at 80% and once at 95% of the cumulative cap.
  onApproachingLimit: (spent, limit) =>
    console.warn(
      `[spend-controls] approaching cap: spent=${spent.atomic}/${limit.atomic} ` +
        `(asset=${limit.asset ?? "n/a"})`,
    ),
};

const ownerAccountName = process.env.CDP_OWNER_ACCOUNT_NAME ?? "x402-scw-owner";
const accountName = process.env.CDP_ACCOUNT_NAME ?? "x402-server-wallet-1";

const cdpX402Client = await createCdpX402Client({
  walletConfig: { type: "cdp-smart", accountName, ownerAccountName },
  spendControls,
});

console.log(`\nSmart Contract Wallet address: ${cdpX402Client.evmAddress}`);

const fetchWithPayment = wrapFetchWithPayment(fetch, cdpX402Client.client);

console.log(`\nMaking request to: ${url}\n`);
try {
  const response = await fetchWithPayment(url, { method: "GET" });
  console.log("Response status:", response.status);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  console.log("Response body:", body);
} catch (err) {
  if (err instanceof SpendControlError) {
    console.error(`[spend-controls] payment rejected: code=${err.code} message=${err.message}`);
    process.exit(1);
  }
  throw err;
}
