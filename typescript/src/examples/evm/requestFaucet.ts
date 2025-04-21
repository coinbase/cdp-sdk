// Usage: pnpm tsx src/examples/evm/requestFaucet.ts

import { config } from "dotenv";

import { CdpClient } from "../../index.js";

/**
 * This example shows how to request faucet funds for an EVM account
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const account = await cdp.evm.createAccount();
  const faucetResult = await cdp.evm.requestFaucet({
    address: account.address,
    network: "base-sepolia",
    token: "eth",
  });

  console.log("Faucet Result: ", faucetResult);
}

main().catch(console.error);
