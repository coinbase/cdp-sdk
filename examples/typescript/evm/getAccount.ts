// Usage: pnpm tsx evm/getAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const newAccount = await cdp.evm.createAccount({ name: "Account1" });
let account = await cdp.evm.getAccount({ address: newAccount.address });

console.log("EVM Account Address: ", account.address);
account = await cdp.evm.getAccount({ name: newAccount.name });
console.log("EVM Account Name: ", account.name);
