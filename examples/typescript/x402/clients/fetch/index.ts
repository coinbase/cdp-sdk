/**
 * Example: CDP Server Wallet payment client.
 *
 * Demonstrates how to use @coinbase/x402 with a CDP Server Wallet (EOA)
 * to make requests to x402-protected endpoints.
 *
 * `CdpX402Client` initializes lazily on the first payment — no await
 * needed at startup. All wallet provisioning happens in the background
 * when the first 402 response is encountered.
 *
 * Required environment variables:
 *   CDP_API_KEY_ID       — Your CDP API key ID
 *   CDP_API_KEY_SECRET   — Your CDP API key secret
 *   CDP_WALLET_SECRET    — Your CDP wallet secret
 *
 * Optional environment variables:
 *   CDP_WALLET_TYPE      — "cdp-eoa" (default) | "cdp-smart"
 *   CDP_ACCOUNT_NAME     — Named CDP account (default: "x402-server-wallet-1")
 *   CDP_OWNER_ACCOUNT_NAME — Owner EOA name (required for cdp-smart type)
 *   RESOURCE_SERVER_URL  — Base URL of the x402-protected server
 *   ENDPOINT_PATH        — Path of the protected endpoint
 */

import { config } from "dotenv";
import { CdpX402Client, wrapFetchWithPayment } from "@coinbase/x402";

config();

const baseURL = process.env.RESOURCE_SERVER_URL ?? "http://localhost:8402";
const endpointPath = process.env.ENDPOINT_PATH ?? "/report";
const url = `${baseURL}${endpointPath}`;

async function main(): Promise<void> {
  // All config is read from environment variables.
  // Set CDP_WALLET_TYPE to switch between cdp-eoa and cdp-smart.
  const client = new CdpX402Client();

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log(`\nMaking request to: ${url}\n`);
  const response = await fetchWithPayment(url, { method: "GET" });
  console.log("Response status:", response.status);

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  console.log("Response body:", body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
