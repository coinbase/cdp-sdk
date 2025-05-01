// Usage: pnpm tsx evm/getOrCreateAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

// Get or create an account
const name = 'Account1';
const account = await cdp.evm.getOrCreateAccount({ name });
console.log("EVM Account Address: ", account.address);

const account2 = await cdp.evm.getOrCreateAccount({ name });
console.log("EVM Account 2 Address: ", account2.address);

const areAccountsEqual = account.address === account2.address;
console.log("Are accounts equal? ", areAccountsEqual);
