// Usage: pnpm tsx src/examples/solana/getAccount.ts

import { config } from "dotenv";

import { CdpClient } from "../../client/cdp";

/**
 * This example shows how to get a Solana account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  let address: string;
  try {
    const account = await cdp.solana.createAccount({ name: "Account1" });
    console.log("Successfully created Solana account:", account.address);
    address = account.address;
  } catch (error) {
    console.error("Error creating Solana account:", error);
    return;
  }

  let account = await cdp.solana.getAccount({
    address,
  });

  console.log("Solana account address:", account.address);

  account = await cdp.solana.getAccount({
    name: account.name,
  });

  console.log("Solana account name:", account.name);
}

main().catch(console.error);
