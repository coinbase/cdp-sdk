// Usage: pnpm tsx solana/listAccounts.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

let page = await cdp.solana.listAccounts();

page.accounts.forEach((account) => console.log(account));

while (page.nextPageToken) {
  page = await cdp.solana.listAccounts({
    pageToken: page.nextPageToken,
  });

  page.accounts.forEach((account) => console.log(account));
}
