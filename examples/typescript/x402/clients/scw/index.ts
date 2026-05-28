/**
 * Example: CDP Smart Contract Wallet payment client.
 *
 * Demonstrates using @coinbase/x402 with a CDP Smart Contract Wallet (ERC-4337)
 * to make requests to x402-protected endpoints.
 *
 * Smart Contract Wallets (SCW) differ from EOAs in that:
 * - The SCW address (not the owner EOA) is the payer for x402 payments.
 * - Signing goes through the owner EOA, which must sign EIP-712 typed data.
 * - SCWs support gas sponsorship and spending permissions on Base/Base Sepolia.
 *
 * `createCdpX402Client` is used here instead of `CdpX402Client` so we can
 * read the SCW address before making the payment (e.g. to fund it first).
 *
 * Required environment variables:
 *   CDP_API_KEY_ID           — Your CDP API key ID
 *   CDP_API_KEY_SECRET       — Your CDP API key secret
 *   CDP_WALLET_SECRET        — Your CDP wallet secret
 *   CDP_OWNER_ACCOUNT_NAME   — Name of the owner EOA (must hold USDC to fund SCW)
 *
 * Optional environment variables:
 *   CDP_ACCOUNT_NAME         — Smart account name (default: "x402-server-wallet-1")
 *   FUND_SCW                 — Set to "true" to transfer USDC from owner → SCW
 *   RESOURCE_SERVER_URL      — Base URL of the x402-protected server
 *   ENDPOINT_PATH            — Path of the protected endpoint
 */

import { config } from "dotenv";
import { parseUnits } from "viem";
import { createCdpX402Client, wrapFetchWithPayment } from "@coinbase/x402";

config();

const baseURL = process.env.RESOURCE_SERVER_URL ?? "http://localhost:8402";
const endpointPath = process.env.ENDPOINT_PATH ?? "/report";
const url = `${baseURL}${endpointPath}`;

async function main(): Promise<void> {
  const ownerAccountName = process.env.CDP_OWNER_ACCOUNT_NAME ?? "x402-scw-owner";
  const accountName = process.env.CDP_ACCOUNT_NAME ?? "x402-server-wallet-1";
  const fundScw = process.env.FUND_SCW === "true";

  const { client, cdpClient, evmAddress: scwAddress, ownerWallet } = await createCdpX402Client({
    walletConfig: {
      type: "cdp-smart",
      accountName,
      ownerAccountName,
    },
  });

  console.log(`\nSmart Contract Wallet address: ${scwAddress}`);
  if (ownerWallet) {
    console.log(`Owner wallet name:             ${ownerWallet}`);
  }

  // Optionally fund the SCW from the owner account before making a payment.
  // Set FUND_SCW=true to enable (requires the owner to hold USDC on Base Sepolia).
  if (fundScw && ownerWallet && cdpClient) {
    console.log("\nFunding SCW from owner account (0.005 USDC)...");
    const ownerAccount = await cdpClient.evm.getOrCreateAccount({ name: ownerAccountName });
    const result = await ownerAccount.transfer({
      to: scwAddress,
      amount: parseUnits("0.005", 6),
      token: "usdc",
      network: "base-sepolia",
    });
    console.log(`Funded! Transaction: ${result.transactionHash}`);
  }

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log(`\nMaking request to: ${url}\n`);
  const response = await fetchWithPayment(url, { method: "GET" });
  console.log("Response status:", response.status);

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  console.log("Response body:", body);

  if (response.status === 402) {
    console.log(
      "\nPayment failed (402). Make sure the smart contract wallet is funded with USDC " +
        `on Base Sepolia at address ${scwAddress}, or set FUND_SCW=true to auto-fund.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
