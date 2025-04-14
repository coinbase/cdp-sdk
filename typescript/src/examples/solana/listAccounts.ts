// Usage: pnpm tsx src/examples/solana/listAccounts.ts

import { config } from "dotenv";

import { CdpClient } from "../../client/cdp";

/**
 * This example shows how to paginate through all Solana accounts
 */
async function main() {
  config();

  const apiKeyId = process.env.CDP_API_KEY_NAME;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  const walletSecret = process.env.CDP_WALLET_SECRET;
  const basePath = process.env.CDP_API_URL;

  if (!apiKeyId || !apiKeySecret || !walletSecret) {
    throw new Error("Missing required environment variables");
  }

  const cdp = new CdpClient({
    apiKeyId,
    apiKeySecret,
    walletSecret,
    basePath,
  });

  try {
    /*
     * create 2 accounts
     * await cdp.createSolanaAccount();
     * await cdp.createSolanaAccount();
     */
  } catch (error) {
    console.error("Error creating Solana account:", error);
    return;
  }

  let page = await cdp.solana.listAccounts({
    pageSize: 2,
  });

  page.accounts.forEach(account => console.log(account));

  while (page.nextPageToken) {
    page = await cdp.solana.listAccounts({
      pageSize: 2,
      pageToken: page.nextPageToken,
    });

    page.accounts.forEach(account => console.log(account));
  }
}

main().catch(console.error);
