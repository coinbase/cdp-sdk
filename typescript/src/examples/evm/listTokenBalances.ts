// Usage: pnpm tsx src/examples/evm/listTokenBalances.ts

import { config } from "dotenv";

import { CdpClient } from "../../index.js";

/**
 * This example shows how to list the token balances of an EVM address
 */
async function main() {
  config();

  const cdp = new CdpClient();

  // Get the first page of token balances for barmstrong.eth.
  const address = "0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0";

  const result = await cdp.evm.listTokenBalances({
    address,
    network: "base-sepolia",
  });

  for (const balance of result.balances) {
    console.log("Token contract address:", balance.token.contractAddress);
    console.log("Token balance:", balance.amount.amount);
  }
}

main().catch(console.error);
