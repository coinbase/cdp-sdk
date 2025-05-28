// Usage: pnpm tsx evm/account.fund.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
async function main() {
  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: "account" });

  const fundOperation = await account.fund({
    network: "base",
    token: "eth",
    amount: 500000000000000n, // 0.0005 eth
  });


  const completedTransfer = await account.waitForFundOperationReceipt({
    transferId: fundOperation.id,
  });

  console.log(completedTransfer);
}

main().catch(console.error);
