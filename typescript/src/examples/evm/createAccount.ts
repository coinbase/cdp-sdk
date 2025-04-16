// Usage: pnpm tsx src/examples/evm/createAccount.ts

import { config } from "dotenv";

import { CdpClient } from "../../index";

/**
 * This example shows how to create a new EVM account
 */
async function main() {
  config();

  const cdp = new CdpClient();
  const account = await cdp.evm.createAccount();
  console.log("EVM Account Address: ", account.address);
}

main().catch(console.error);
