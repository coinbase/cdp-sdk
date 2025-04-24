// Usage: pnpm tsx evm/getSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const cdp = new CdpClient();

const privateKey = generatePrivateKey();
const owner = privateKeyToAccount(privateKey);

const smartAccount = await cdp.evm.createSmartAccount({ owner });

const retrievedSmartAccount = await cdp.evm.getSmartAccount({
  address: smartAccount.address,
  owner,
});

console.log("Retrieved Smart Account: ", retrievedSmartAccount);
