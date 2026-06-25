// Usage: pnpm tsx x402/clients/payForApi.ts

/**
 * Pay for an x402-protected API using a CDP-managed wallet.
 *
 * `CdpX402Client` auto-provisions a CDP Server Wallet (EOA), registers EVM
 * and Solana payment schemes, and handles 402 responses automatically. All
 * credentials are read from environment variables.
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env
 *
 * Funding the wallet (Base Sepolia USDC):
 *   The example prints its EVM address on startup. Fund it before paying via:
 *   - CDP Faucet (portal):  https://portal.cdp.coinbase.com -> "Onchain Tools" -> "Faucet"
 *   - Programmatically:     cdp.evm.requestFaucet({ address, network: "base-sepolia", token: "usdc" })
 *   Set X402_FUND_FROM_FAUCET=true to have this example auto-request USDC from
 *   the CDP faucet on startup. The CDP faucet funds the same wallets the CDP
 *   x402 facilitator settles against — no separate faucet needed.
 *
 * Optional overrides:
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
  const { client, cdpClient, evmAddress, svmAddress } = await createCdpX402Client();

  console.log("CDP-managed x402 client ready");
  console.log("  EVM address:", evmAddress);
  console.log("  Solana address:", svmAddress);
  console.log("  Fund the EVM address with USDC on Base Sepolia before making payments:");
  console.log("    CDP Faucet: https://portal.cdp.coinbase.com/products/faucet\n");

  // Optional: top up the wallet straight from the CDP faucet. The same CDP
  // credentials power both the faucet and the x402 facilitator.
  if (process.env.X402_FUND_FROM_FAUCET === "true") {
    console.log("Requesting USDC from the CDP faucet...");
    try {
      const { transactionHash } = await cdpClient.evm.requestFaucet({
        address: evmAddress,
        network: "base-sepolia",
        token: "usdc",
      });
      console.log(`  Faucet tx: ${transactionHash}`);
      console.log("  Wait for it to confirm, then re-run without the flag to pay.\n");
      return;
    } catch {
      // The wallet may already be funded, or the project faucet limit was hit.
      console.warn("  Faucet request failed — you may already be funded, or hit the project limit.");
      console.warn("  Fund manually if needed: https://portal.cdp.coinbase.com/products/faucet\n");
      // Fall through and attempt the payment anyway.
    }
  }

  // Wrap fetch with the x402 client — handles 402 responses automatically.
  const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);

  console.log(`Requesting: ${X402_PAID_API_URL}`);
  const response = await fetchWithPayment(X402_PAID_API_URL);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  console.log(`Payment succeeded — HTTP ${response.status}`);

  // The protected resource decides its own content type, so parse defensively
  // rather than assuming JSON (the x402.org demo endpoint returns HTML).
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    console.log("Response:", JSON.stringify(await response.json(), null, 2));
  } else {
    const text = await response.text();
    console.log("Response:", text.length > 500 ? `${text.slice(0, 500)}… (${text.length} bytes)` : text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
