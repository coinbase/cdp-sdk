// Usage: pnpm tsx solana/getOrCreateAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const account = await cdp.solana.getOrCreateAccount({ name: "Account1" });
console.log(
  "Account:",
  JSON.stringify(account, null, 2)
);

const account2 = await cdp.solana.getAccount({
  address: account.address,
});

console.log(
  "Account 2:",
  JSON.stringify(account, null, 2)
);

const areAccountsEqual = account.address === account2.address;
console.log("Are accounts equal? ", areAccountsEqual);
