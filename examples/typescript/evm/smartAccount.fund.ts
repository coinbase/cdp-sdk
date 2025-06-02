// Usage: pnpm tsx evm/smartAccount.fund.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

async function main() {
  const cdp = new CdpClient();

  const account = await cdp.evm.getOrCreateAccount({ name: "account" });
  const smartAccount = await cdp.evm.createSmartAccount({ owner: account });

  const fundOperation = await smartAccount.fund({
    network: "base",
    token: "usdc",
    amount: 1000000n, // 1 USDC
  });


  const completedTransfer = await smartAccount.waitForFundOperationReceipt({
    transferId: fundOperation.id,
  });

  console.log(completedTransfer);
}

main().catch(console.error);
