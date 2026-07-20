// Usage: pnpm tsx x402/clients/payForApiWithAxios.ts

/**
 * Pay for an x402-protected API with axios instead of fetch.
 *
 * The CDP wiring is identical to `payForApi.ts` — `CdpX402Client` provisions a
 * CDP-managed wallet and handles 402s. Only the transport differs: wrap an
 * axios instance with `wrapAxiosWithPayment` instead of `globalThis.fetch` with
 * `wrapFetchWithPayment`. `CdpX402Client` extends the base `x402Client`, so it
 * drops into either wrapper unchanged.
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env.
 *
 * Funding the wallet (Base Sepolia USDC):
 *   This example prints its wallet address on startup — fund that address with
 *   USDC on Base Sepolia before paying. See the x402 examples README.
 */
import "dotenv/config";

import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapAxiosWithPayment } from "@x402/axios";
import axios from "axios";

const X402_PAID_API_URL = process.env.X402_API_URL ?? "https://x402.vercel.app/protected";

async function main() {
  // CdpX402Client lazily provisions its wallet on first payment and handles
  // 402 responses automatically. Calling `getAddresses()` eagerly provisions
  // it now, so we know which address to fund before paying.
  // "development" registers Base Sepolia, since this example pays there.
  const client = new CdpX402Client({ environment: "development" });
  const { evmAddress, svmAddress } = await client.getAddresses();

  console.log("CDP-managed x402 client ready (axios transport)");
  console.log("  EVM address:", evmAddress);
  console.log("  Solana address:", svmAddress);
  console.log("  Fund the EVM address with USDC on Base Sepolia before paying.\n");

  // Wrap an axios instance — the same CdpX402Client that powers wrapFetchWithPayment.
  const api = wrapAxiosWithPayment(axios.create(), client);

  console.log(`Requesting: ${X402_PAID_API_URL}`);
  const response = await api.get(X402_PAID_API_URL);

  console.log(`Payment succeeded — HTTP ${response.status}`);
  // axios already parses JSON; fall back to the raw body for other content types.
  const body = typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2);
  console.log("Response:", body.length > 500 ? `${body.slice(0, 500)}… (${body.length} bytes)` : body);
}

main().catch(err => {
  // axios surfaces HTTP errors on err.response; print the useful part.
  console.error(err?.response?.data ?? err);
  process.exit(1);
});
