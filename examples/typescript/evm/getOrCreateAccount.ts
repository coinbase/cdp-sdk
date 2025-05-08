// Usage: pnpm tsx evm/getOrCreateAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

// Get or create an account
const name = "Account1";
const account = await cdp.evm.getOrCreateAccount({ name });
console.log("EVM Account Address: ", account.address);

const account2 = await cdp.evm.getOrCreateAccount({ name });
console.log("EVM Account 2 Address: ", account2.address);

const areAccountsEqual = account.address === account2.address;
console.log("Are accounts equal? ", areAccountsEqual);

const accountPromise1 = cdp.evm.getOrCreateAccount({ name: "Account" });
const accountPromise2 = cdp.evm.getOrCreateAccount({ name: "Account" });
const accountPromise3 = cdp.evm.getOrCreateAccount({ name: "Account" });
Promise.all([accountPromise1, accountPromise2, accountPromise3]).then(
  ([account1, account2, account3]) => {
    console.log("EVM Account Address 1: ", account1.address);
    console.log("EVM Account Address 2: ", account2.address);
    console.log("EVM Account Address 3: ", account3.address);
  }
);
