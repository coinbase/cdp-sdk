// Usage: pnpm tsx solana/getOrCreateAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.solana.getOrCreateAccount({ name: "Account1" });
console.log("Account:", JSON.stringify(account, null, 2));

const account2 = await cdp.solana.getAccount({
  address: account.address,
});

console.log("Account 2:", JSON.stringify(account, null, 2));

const areAccountsEqual = account.address === account2.address;
console.log("Are accounts equal? ", areAccountsEqual);

const accountPromise1 = cdp.solana.getOrCreateAccount({ name: "Account" });
const accountPromise2 = cdp.solana.getOrCreateAccount({ name: "Account" });
const accountPromise3 = cdp.solana.getOrCreateAccount({ name: "Account" });
Promise.all([accountPromise1, accountPromise2, accountPromise3]).then(
  ([account1, account2, account3]) => {
    console.log("Solana Account Address 1: ", account1.address);
    console.log("Solana Account Address 2: ", account2.address);
    console.log("Solana Account Address 3: ", account3.address);
  }
);
