// Usage: pnpm tsx solana/listTokenBalances.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const address = "4PkiqJkUvxr9P8C1UsMqGN8NJsUcep9GahDRLfmeu8UK";

const firstPage = await cdp.solana.listTokenBalances({
  address,
  network: "solana-devnet",
  pageSize: 3,
});

console.log("First page:");
for (const balance of firstPage.balances) {
  console.log("Balance amount:", balance.amount.amount);
  console.log("Balance decimals:", balance.amount.decimals);
  console.log("Balance token mint address:", balance.token.mintAddress);
  console.log("Balance token symbol:", balance.token.symbol);
  console.log("Balance token name:", balance.token.name);
  console.log('---');
}

if (firstPage.nextPageToken) {
  const secondPage = await cdp.solana.listTokenBalances({
    address,
    network: "solana-devnet",
    pageSize: 2,
    pageToken: firstPage.nextPageToken,
  });

  console.log("\nSecond page:");
  for (const balance of secondPage.balances) {
    console.log("Balance amount:", balance.amount.amount);
    console.log("Balance decimals:", balance.amount.decimals);
    console.log("Balance token mint address:", balance.token.mintAddress);
    console.log("Balance token symbol:", balance.token.symbol);
    console.log("Balance token name:", balance.token.name);
    console.log('---');
  }
}
