// Usage: pnpm tsx solana/getAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

let account = await cdp.solana.createAccount({
  name: `Account-${Math.floor(Math.random() * 100)}`,
});
console.log(
  "Successfully created Solana account:",
  JSON.stringify(account, null, 2)
);

account = await cdp.solana.getAccount({
  address: account.address,
});

console.log("Got Solana account by address:", account.address);

account = await cdp.solana.getAccount({
  name: account.name,
});

console.log("Got Solana account by name:", account.name);
