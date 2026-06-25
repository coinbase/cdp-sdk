// Usage: pnpm tsx x402/clients/x402DevMigration.ts

/**
 * x402 Dev — Swap a self-managed private key signer for a CDP-managed wallet.
 *
 * If you already use `@x402/core` with your own private key signer, this
 * example shows two migration paths:
 *
 * 1. **Drop-in replacement**: swap `x402Client` for `CdpX402Client` — CDP
 *    provisions the wallet, registers schemes, and handles balance checks.
 *
 * 2. **Slot in CDP signer**: keep your existing `x402Client` setup but
 *    replace the private-key `ClientEvmSigner` with a CDP EVM account.
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env
 */
import "dotenv/config";

import { CdpClient } from "@coinbase/cdp-sdk";
import { CdpX402Client, fromCdpEvmAccount } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

const X402_PAID_API_URL = process.env.X402_API_URL ?? "https://x402.org/protected";

// ── Migration path 1: drop-in CdpX402Client ──────────────────────────────────
async function dropInReplacement() {
  console.log("=== Migration path 1: CdpX402Client drop-in ===");

  // Before (self-managed key):
  //   const client = new x402Client();
  //   client.register("eip155:*", new ExactEvmScheme(privateKeySigner));

  // After (CDP-managed wallet):
  const client = new CdpX402Client();
  const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);

  const response = await fetchWithPayment(X402_PAID_API_URL);
  console.log("Status:", response.status);
}

// ── Migration path 2: slot a CDP signer into an existing x402Client ───────────
async function slotInCdpSigner() {
  console.log("\n=== Migration path 2: CDP signer inside x402Client ===");

  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: "my-x402-signer" });
  console.log("CDP EVM account:", account.address);

  // Replace `EthAccountSigner(privateKey)` with `fromCdpEvmAccount(account)`:
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: fromCdpEvmAccount(account) });

  const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);
  const response = await fetchWithPayment(X402_PAID_API_URL);
  console.log("Status:", response.status);
}

async function main() {
  await dropInReplacement();
  await slotInCdpSigner();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
