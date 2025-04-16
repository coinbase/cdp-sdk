// Usage: pnpm tsx src/examples/solana/createAccount.ts

import { config } from "dotenv";

import { CdpClient } from "../../client/cdp";

/**
 * This example shows how to create a new Solana account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  try {
    const account = await cdp.solana.createAccount();
    console.log("Successfully created Solana account:", account);
  } catch (error) {
    console.error("Error creating Solana account:", error);
  }
}

main().catch(console.error);
