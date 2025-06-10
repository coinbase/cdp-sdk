// Usage: pnpm tsx evm/getOrCreateSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

// First create an owner account
const owner = await cdp.evm.createAccount();
console.log("Created owner account:", owner.address);

// Get or create a smart account with the owner
const name = "Account1";
const account = await cdp.evm.getOrCreateSmartAccount({ name, owner });
console.log("EVM Smart Account Address:", account.address);

const account2 = await cdp.evm.getOrCreateSmartAccount({ name, owner });
console.log("EVM Smart Account 2 Address:", account2.address);

const areAccountsEqual = account.address === account2.address;
console.log("Are accounts equal?", areAccountsEqual);

// Example of concurrent requests
const accountPromise1 = cdp.evm.getOrCreateSmartAccount({ name: "Account", owner });
const accountPromise2 = cdp.evm.getOrCreateSmartAccount({ name: "Account", owner });
const accountPromise3 = cdp.evm.getOrCreateSmartAccount({ name: "Account", owner });
Promise.all([accountPromise1, accountPromise2, accountPromise3]).then(
  ([account1, account2, account3]) => {
    console.log("EVM Account Address 1:", account1.address);
    console.log("EVM Account Address 2:", account2.address);
    console.log("EVM Account Address 3:", account3.address);
  }
);
