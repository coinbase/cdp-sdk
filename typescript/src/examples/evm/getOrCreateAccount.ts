// Usage: pnpm tsx src/examples/evm/getOrCreateAccount.ts

import { config } from "dotenv";

import { CdpClient } from "../../index";

/**
 * This example shows how to get or create an EVM account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const account = await cdp.evm.getOrCreateAccount({ name: "Account2" });
  console.log("Account:", JSON.stringify(account, null, 2));
}

main().catch(console.error);
