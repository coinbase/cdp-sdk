// Usage: pnpm tsx evm/listAccounts.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

let page = await cdp.evm.listAccounts();

page.accounts.forEach((account) => console.log(account.address));

while (page.nextPageToken) {
  page = await cdp.evm.listAccounts({ pageToken: page.nextPageToken });
  page.accounts.forEach((account) => console.log(account.address));
}
