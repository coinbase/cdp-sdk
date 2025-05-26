// Usage: pnpm tsx evm/account.quoteAndExecute.ts

import { CdpClient } from "../../../typescript/src/index.js";

async function main() {
  const cdp = new CdpClient();
  const account = await cdp.evm.createAccount({ name: "Sender" });

  // Example using quote
  const quote = await account.quoteFund({
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
    console.log(fee.type) // operation or network
    console.log(fee.amount) // amount in the token
    console.log(fee.currency) // currency of the amount
  }

  const response = await quote.execute();

  const completedTransfer = await account.waitForFundOperationReceipt({
    transferId: response.transfer.id,
  });
}

main().catch(console.error);
