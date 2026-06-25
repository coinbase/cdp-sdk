// Usage: pnpm tsx x402/clients/payForApi.ts

/**
 * CDP Dev — Pay for an x402-protected API using a CDP-managed wallet.
 *
 * `CdpX402Client` auto-provisions a CDP Server Wallet (EOA), registers EVM
 * and Solana payment schemes, and handles 402 responses automatically. All
 * credentials are read from environment variables.
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env
 *   Fund the printed EVM address with USDC on Base Sepolia before running.
 *
 * Optional overrides:
 *   CDP_WALLET_TYPE         - "eoa" (default) or "smart"
 *   CDP_ACCOUNT_NAME        - wallet name (default: "x402-client-wallet-1")
 *   CDP_X402_RPC_URLS       - JSON map of CAIP-2 IDs to RPC URLs
 */
import "dotenv/config";

import { createCdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";

const X402_PAID_API_URL =
  process.env.X402_API_URL ?? "https://x402.org/protected";

async function main() {
  // Eagerly provision the wallet so we can print the EVM address before
  // making any payments (useful for funding the wallet first).
  const { client, evmAddress, svmAddress } = await createCdpX402Client();

  console.log("CDP-managed x402 client ready");
  console.log("  EVM address:", evmAddress);
  console.log("  Solana address:", svmAddress);
  console.log("  Fund the EVM address with USDC on Base Sepolia before making payments.\n");

  // Wrap fetch with the x402 client — handles 402 responses automatically.
  const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);

  console.log(`Requesting: ${X402_PAID_API_URL}`);
  const response = await fetchWithPayment(X402_PAID_API_URL);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  console.log("Response:", JSON.stringify(body, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
