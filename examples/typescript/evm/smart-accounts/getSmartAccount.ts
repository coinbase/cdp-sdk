// Usage: pnpm tsx evm/smart-accounts/getSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const owner = await cdp.evm.getOrCreateAccount({ name: "SmartAccountOwner" });

let smartAccount = await cdp.evm.createSmartAccount({ owner });
console.log("Created smart account:", smartAccount.address);

smartAccount = await cdp.evm.getSmartAccount({
  address: smartAccount.address,
  owner,
});

console.log("Retrieved smart account: ", smartAccount);
