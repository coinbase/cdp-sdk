// Usage: pnpm tsx evm/listSmartAccounts.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

let page = await cdp.evm.listSmartAccounts();

page.accounts.forEach((account) => console.log(account.address));

while (page.nextPageToken) {
  page = await cdp.evm.listSmartAccounts({ pageToken: page.nextPageToken });
  page.accounts.forEach((account) => console.log(account.address));
}
