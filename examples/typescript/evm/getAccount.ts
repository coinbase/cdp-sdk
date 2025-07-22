// Usage: pnpm tsx evm/getAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

let account = await cdp.evm.createAccount({
  name: `Account-${Math.floor(Math.random() * 100)}`,
});
console.log("Created account:", account.address);

account = await cdp.evm.getAccount({ address: account.address });
console.log("Retrieved account by address:", account.address);

account = await cdp.evm.getAccount({ name: account.name });
console.log("Retrieved account by name:", account.name);
