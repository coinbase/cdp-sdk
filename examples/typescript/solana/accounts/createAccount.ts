// Usage: pnpm tsx solana/accounts/createAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.solana.createAccount();
console.log(
  "Successfully created Solana account:",
  JSON.stringify(account, null, 2)
);
