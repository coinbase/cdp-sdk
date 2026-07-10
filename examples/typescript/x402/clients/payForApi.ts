// Usage: pnpm tsx x402/clients/payForApi.ts

/**
 * Pay for an x402-protected API using a CDP-managed wallet.
 *
 * `CdpX402Client` auto-provisions a CDP Server Wallet (EOA) named
 * `"x402-client-wallet-1"` (override via `walletConfig.accountName`),
 * registers EVM and Solana payment schemes, and handles 402 responses
 * automatically. All credentials are read from environment variables.
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env
 *
 * Funding the wallet (Base Sepolia USDC):
 *   The example resolves and prints the client's wallet addresses upfront via
 *   `client.getAddresses()` — this is how you find which address to fund,
 *   since the wallet used for payment is otherwise managed internally. Fund
 *   it before paying, or set X402_FUND_FROM_FAUCET=true to auto-request USDC
 *   from the CDP faucet on startup. See the x402 examples README for funding
 *   options and env vars.
 */
import "dotenv/config";

import { CdpClient } from "@coinbase/cdp-sdk";
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";

const X402_PAID_API_URL =
  process.env.X402_API_URL ?? "https://x402.vercel.app/protected";

async function main() {
  // CdpX402Client lazily provisions its wallet on first payment and handles
  // 402 responses automatically. Calling `getAddresses()` eagerly provisions
  // it now, so we know which address to fund before paying.
  const client = new CdpX402Client();
  const { evmAddress, svmAddress } = await client.getAddresses();

  console.log("CDP-managed x402 client ready");
  console.log("  EVM address:", evmAddress);
  console.log("  Solana address:", svmAddress);
  console.log("  Fund the EVM address with USDC on Base Sepolia before making payments:");
  console.log("    CDP Faucet: https://portal.cdp.coinbase.com -> \"Onchain Tools\" -> \"Faucet\"\n");

  // Optional: top up the wallet straight from the CDP faucet. The same CDP
  // credentials power both the faucet and the x402 facilitator.
  if (process.env.X402_FUND_FROM_FAUCET === "true") {
    console.log("Requesting USDC from the CDP faucet...");
    try {
      const cdpClient = new CdpClient();
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
      console.warn("  Fund manually if needed: https://portal.cdp.coinbase.com -> \"Onchain Tools\" -> \"Faucet\"\n");
      // Fall through and attempt the payment anyway.
    }
  }

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
