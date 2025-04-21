// Usage: pnpm tsx src/examples/evm/getSmartAccount.ts

import { config } from "dotenv";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { CdpClient } from "../../index.js";

/**
 * This example shows how to get an EVM smart account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const privateKey = generatePrivateKey();
  const owner = privateKeyToAccount(privateKey);

  const smartAccount = await cdp.evm.createSmartAccount({ owner });

  const retrievedSmartAccount = await cdp.evm.getSmartAccount({
    address: smartAccount.address,
    owner,
  });

  console.log("Retrieved Smart Account: ", retrievedSmartAccount);
}

main().catch(console.error);
