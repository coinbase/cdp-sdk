// Usage: pnpm tsx evm/smartAccount.quoteFundAndExecute.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

async function main() {
  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: "account" });
  const smartAccount = await cdp.evm.createSmartAccount({ owner: account });

  const quote = await smartAccount.quoteFund({
    network: "base",
    token: "usdc",
    amount: 1000000n, // 1 USDC
  });

  // get details of the quote
  console.log(quote.fiatAmount)
  console.log(quote.tokenAmount)
  console.log(quote.token)
  console.log(quote.network)
  for (const fee of quote.fees) {
    console.log(fee.type) // network_fee or exchange_fee
    console.log(fee.amount) // amount in the token
    console.log(fee.currency) // currency of the amount
  }

  const response = await quote.execute();

  const completedTransfer = await smartAccount.waitForFundOperationReceipt({
    transferId: response.id,
  });

  console.log(completedTransfer);
}

main().catch(console.error);
