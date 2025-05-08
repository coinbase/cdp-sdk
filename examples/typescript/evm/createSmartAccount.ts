// Usage: pnpm tsx evm/createSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

const smartAccount = await cdp.evm.createSmartAccount({
  owner: account,
});

console.log(
  `Created smart account: ${smartAccount.address}. Owner address: ${account.address}`
);
