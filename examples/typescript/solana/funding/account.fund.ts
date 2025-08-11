// Usage: pnpm tsx solana/funding/account.fund.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
async function main() {
  const cdp = new CdpClient();
  const account = await cdp.solana.getOrCreateAccount({ name: "account" });

  const fundOperation = await account.fund({
    token: "sol",
    amount: 10000000n, // 0.01 sol
  });

  const completedTransfer = await account.waitForFundOperationReceipt({
    transferId: fundOperation.id,
  });

  console.log(completedTransfer);
}

main().catch(console.error);
