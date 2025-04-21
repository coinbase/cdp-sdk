// Usage: pnpm tsx src/examples/evm/listSmartAccounts.ts

import { config } from "dotenv";

import { CdpClient } from "../../index.js";

/**
 * This example shows how to list EVM smart accounts
 */
async function main() {
  config();

  const cdp = new CdpClient();

  let page = await cdp.evm.listSmartAccounts();

  page.accounts.forEach(account => console.log(account.address));

  while (page.nextPageToken) {
    page = await cdp.evm.listSmartAccounts({ pageToken: page.nextPageToken });
    page.accounts.forEach(account => console.log(account.address));
  }
}

main().catch(console.error);
