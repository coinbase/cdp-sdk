/**
 * Pay for an x402-protected API endpoint using a CDP-managed wallet.
 *
 * This example demonstrates the CDP Dev journey: provision a CDP wallet,
 * wrap fetch with automatic x402 payment handling, and call a protected API.
 *
 * Usage:
 *   pnpm tsx x402/payX402Endpoint.ts
 *
 * Required environment variables:
 *   CDP_API_KEY_ID       - Your CDP API key ID
 *   CDP_API_KEY_SECRET   - Your CDP API key secret
 *   CDP_WALLET_SECRET    - Your CDP wallet secret
 *
 * Optional environment variables:
 *   CDP_X402_RPC_URLS    - JSON object mapping CAIP-2 network IDs to RPC URLs
 *                          e.g. '{"eip155:8453":"https://base.rpc"}'
 */

// pnpm tsx x402/payX402Endpoint.ts
import "dotenv/config";
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";

// ─── CDP Dev: Pay using a CDP-managed wallet ──────────────────────────────────
//
// CdpX402Client is a drop-in replacement for x402Client. It auto-provisions a
// CDP Server Wallet, registers payment schemes, and initializes lazily on the
// first payment call. No private keys to manage.

const client = new CdpX402Client();

// Check what wallet address will be used for payments (triggers lazy init)
const evmAddress = await client.getEvmAddress();
console.log("Paying from EVM address:", evmAddress);

// Wrap fetch with automatic x402 payment handling.
// When the server returns 402, wrapFetchWithPayment automatically:
//   1. Parses payment requirements from the response
//   2. Creates a signed payment payload via CdpX402Client
//   3. Retries the request with the payment header
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// ─── Make a paid API call ────────────────────────────────────────────────────
// Replace with any x402-protected API endpoint.
const X402_API_URL = process.env.X402_API_URL ?? "https://x402.org/protected";

console.log(`Calling ${X402_API_URL}...`);

const response = await fetchWithPayment(X402_API_URL);

if (response.ok) {
  const data = await response.json().catch(() => response.text());
  console.log("Response:", data);
} else {
  console.error(`Request failed with status ${response.status}`);
}

// ─── x402 Dev migration: swap a self-managed signer for CDP ──────────────────
//
// Before (self-managed key):
//
//   import { x402Client } from "@x402/core/client";
//   import { registerExactEvmScheme } from "@x402/evm/exact/client";
//   import { wrapFetchWithPayment } from "@x402/fetch";
//   import { createWalletClient } from "viem";
//
//   const client = new x402Client();
//   registerExactEvmScheme(client, { signer: yourOwnSigner });
//   const fetchWithPayment = wrapFetchWithPayment(fetch, client);
//
//
// After (CDP-managed wallet — same wrapFetchWithPayment call):
//
//   import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
//   import { wrapFetchWithPayment } from "@x402/fetch";
//
//   const client = new CdpX402Client();  // extends x402Client, drop-in ready
//   const fetchWithPayment = wrapFetchWithPayment(fetch, client);  // unchanged

// ─── Eager init: get wallet address before first payment ──────────────────────
//
// Use createCdpX402Client() when you need to know the wallet address up front
// (e.g. to fund the wallet before making any payments):
//
//   import { createCdpX402Client } from "@coinbase/cdp-sdk/x402";
//
//   const { client, evmAddress, svmAddress } = await createCdpX402Client();
//   console.log("Fund this address before making payments:", evmAddress);
//   const fetchWithPayment = wrapFetchWithPayment(fetch, client);
