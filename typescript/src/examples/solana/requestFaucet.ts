// Usage: pnpm tsx src/examples/solana/requestFaucet.ts

import { config } from "dotenv";

import { CdpClient } from "../../client/cdp.js";

/**
 * This example shows how to create a new Solana account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  let address: string;
  try {
    const account = await cdp.solana.createAccount();
    console.log("Successfully created Solana account:", account);
    address = account.address;
  } catch (error) {
    console.error("Error creating Solana account:", error);
    return;
  }

  try {
    const { signature } = await cdp.solana.requestFaucet({ address, token: "sol" });
    console.log("Successfully requested Solana faucet:", signature);
  } catch (error) {
    console.error("Error requesting Solana faucet:", error);
  }
}

main().catch(console.error);
