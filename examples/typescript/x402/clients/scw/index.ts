// Usage: pnpm tsx x402/clients/scw/index.ts
//
// Set CDP_OWNER_ACCOUNT_NAME to the name of the owner EOA.
// Set FUND_SCW=true to auto-transfer 0.005 USDC from owner → SCW (requires funded owner).

import { parseUnits } from "viem";
import { createCdpX402Client, wrapFetchWithPayment } from "@coinbase/cdp-sdk/x402";
import "dotenv/config";

const baseURL = process.env.RESOURCE_SERVER_URL ?? "http://localhost:8402";
const endpointPath = process.env.ENDPOINT_PATH ?? "/report";
const url = `${baseURL}${endpointPath}`;

const ownerAccountName = process.env.CDP_OWNER_ACCOUNT_NAME ?? "x402-scw-owner";
const accountName = process.env.CDP_ACCOUNT_NAME ?? "x402-server-wallet-1";
const fundScw = process.env.FUND_SCW === "true";

const cdpX402ClientResult = await createCdpX402Client({
  walletConfig: { type: "cdp-smart", accountName, ownerAccountName },
});
const { cdpClient, evmAddress: scwAddress, ownerWallet } = cdpX402ClientResult;

console.log(`\nSmart Contract Wallet address: ${scwAddress}`);
if (ownerWallet) console.log(`Owner wallet name:             ${ownerWallet}`);

// Optionally fund the SCW from the owner EOA before making a payment.
if (fundScw && ownerWallet && cdpClient) {
  console.log("\nFunding SCW from owner account (0.005 USDC)...");
  const ownerAccount = await cdpClient.evm.getOrCreateAccount({ name: ownerAccountName });
  const transfer = await ownerAccount.transfer({
    to: scwAddress,
    amount: parseUnits("0.005", 6),
    token: "usdc",
    network: "base-sepolia",
  });
  console.log(`Funded! Transaction: ${transfer.transactionHash}`);
}

const fetchWithPayment = wrapFetchWithPayment(fetch, cdpX402ClientResult.client);

console.log(`\nMaking request to: ${url}\n`);
const response = await fetchWithPayment(url, { method: "GET" });
console.log("Response status:", response.status);

const contentType = response.headers.get("content-type") ?? "";
const body = contentType.includes("application/json")
  ? await response.json()
  : await response.text();
console.log("Response body:", body);
