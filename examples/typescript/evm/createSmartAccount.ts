// Usage: pnpm tsx evm/createSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

const smartAccount = await cdp.evm.createSmartAccount({
  owner: account,
});

console.log("EVM Smart Account Address: ", smartAccount.address);
