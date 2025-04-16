// Usage: pnpm tsx src/examples/evm/getAccount.ts

import { config } from "dotenv";

import { CdpClient } from "../../index";

/**
 * This example shows how to get an EVM account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const newAccount = await cdp.evm.createAccount({ name: "Account1" });
  let account = await cdp.evm.getAccount({ address: newAccount.address });

  console.log("EVM Account Address: ", account.address);
  account = await cdp.evm.getAccount({ name: newAccount.name });
  console.log("EVM Account Name: ", account.name);
}

main().catch(console.error);
