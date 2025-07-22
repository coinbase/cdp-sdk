// Usage: pnpm tsx evm/getSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const cdp = new CdpClient();

const privateKey = generatePrivateKey();
const owner = privateKeyToAccount(privateKey);

let smartAccount = await cdp.evm.createSmartAccount({ owner });
console.log("Created smart account:", smartAccount.address);

smartAccount = await cdp.evm.getSmartAccount({
  address: smartAccount.address,
  owner,
});

console.log("Retrieved smart account: ", smartAccount);
