// Usage: pnpm tsx src/examples/evm/createSmartAccount.ts

import { config } from "dotenv";

import { CdpClient } from "../../index";

/**
 * This example shows how to create a new EVM smart account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const account = await cdp.evm.createAccount();

  const smartAccount = await cdp.evm.createSmartAccount({
    owner: account,
  });

  console.log("EVM Smart Account Address: ", smartAccount.address);
}

main().catch(console.error);
