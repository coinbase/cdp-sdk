// Usage: pnpm tsx evm/createAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const account = await cdp.evm.createAccount();
console.log("Created account: ", account.address);
