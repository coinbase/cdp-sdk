// Usage: pnpm tsx x402/clients/fetch/index.ts

import { CdpX402Client, wrapFetchWithPayment } from "@coinbase/cdp-sdk/x402";
import "dotenv/config";

const baseURL = process.env.RESOURCE_SERVER_URL ?? "http://localhost:8402";
const endpointPath = process.env.ENDPOINT_PATH ?? "/report";
const url = `${baseURL}${endpointPath}`;

// CdpX402Client initializes lazily on the first payment — no await needed.
// Set CDP_WALLET_TYPE=cdp-smart to switch to a Smart Contract Wallet.
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
