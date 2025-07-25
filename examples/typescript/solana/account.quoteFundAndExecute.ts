// Usage: pnpm tsx solana/account.quoteFundAndExecute.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

async function main() {
  const cdp = new CdpClient();
  const account = await cdp.solana.getOrCreateAccount({ name: "account" });

  const quote = await account.quoteFund({
    token: "sol",
    amount: 10000000n, // 0.01 sol
  });

  // get details of the quote
  console.log("Fiat amount: ", quote.fiatAmount)
  console.log("Fiat currency: ", quote.fiatCurrency)
  console.log("Token amount: ", quote.tokenAmount)
  console.log("Token: ", quote.token)
  console.log("Network: ", quote.network)
  for (const fee of quote.fees) {
    console.log("Fee type: ", fee.type) // network_fee or exchange_fee
    console.log("Fee amount: ", fee.amount) // amount in the token
    console.log("Fee currency: ", fee.currency) // currency of the amount
  }

  const response = await quote.execute();

  const completedTransfer = await account.waitForFundOperationReceipt({
    transferId: response.id
  });

  console.log(completedTransfer);
}

main().catch(console.error);
