/**
 * Example: CDP Smart Contract Wallet payment client *with* spend controls.
 *
 * Demonstrates the `spendControls` field on `createCdpX402Client`. The
 * caller wires per-payment + cumulative caps, an allow-list of payees, and an
 * `onApproachingLimit` notifier without writing any hooks themselves.
 *
 * Required environment variables:
 *   CDP_API_KEY_ID           — Your CDP API key ID
 *   CDP_API_KEY_SECRET       — Your CDP API key secret
 *   CDP_WALLET_SECRET        — Your CDP wallet secret
 *   CDP_OWNER_ACCOUNT_NAME   — Name of the owner EOA (must hold USDC to fund SCW)
 *
 * Optional environment variables:
 *   CDP_ACCOUNT_NAME         — Smart account name (default: "x402-server-wallet-1")
 *   RESOURCE_SERVER_URL      — Base URL of the x402-protected server
 *   ENDPOINT_PATH            — Path of the protected endpoint
 */

import { config } from "dotenv";
import {
  createCdpX402Client,
  SpendControlError,
  wrapFetchWithPayment,
  type SpendControls,
} from "@coinbase/x402";

config();

const baseURL = process.env.RESOURCE_SERVER_URL ?? "http://localhost:4021";
const endpointPath = process.env.ENDPOINT_PATH ?? "/weather";
const url = `${baseURL}${endpointPath}`;

// USDC on Base Sepolia.
const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

const spendControls: SpendControls = {
  // Cap: 0.01 USDC per individual payment (USDC has 6 decimals).
  maxAmountPerPayment: { atomic: 10_000n, asset: USDC_BASE_SEPOLIA },

  // Cap: 0.05 USDC per rolling 24h window across all matching payments.
  maxCumulativeSpend: { atomic: 50_000n, asset: USDC_BASE_SEPOLIA },
  maxCumulativeSpendWindow: "24h",

  // Stay on Base Sepolia and only spend USDC.
  allowedNetworks: ["eip155:84532"],
  allowedAssets: [USDC_BASE_SEPOLIA],

  // Notifier — fires once at 80% and once at 95% of the cumulative cap.
  onApproachingLimit: (spent, limit) =>
    console.warn(
      `[spend-controls] approaching cap: spent=${spent.atomic}/${limit.atomic} ` +
        `(asset=${limit.asset ?? "n/a"})`,
    ),
};

async function main(): Promise<void> {
  const ownerAccountName =
    process.env.CDP_OWNER_ACCOUNT_NAME ?? "x402-scw-owner";
  const accountName = process.env.CDP_ACCOUNT_NAME ?? "x402-server-wallet-1";

  const cdpX402Client = await createCdpX402Client({
    walletConfig: {
      type: "cdp-smart",
      accountName,
      ownerAccountName,
    },
    spendControls,
  });
  const { evmAddress: scwAddress, ownerWallet } = cdpX402Client;

  console.log(`\nSmart Contract Wallet address: ${scwAddress}`);
  if (ownerWallet) {
    console.log(`Owner wallet name:             ${ownerWallet}`);
  }

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
      console.error(
        `[spend-controls] payment rejected: code=${err.code} message=${err.message}`,
      );
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
