// Usage: pnpm tsx evm/account.fund.ts

import { CdpClient } from "@coinbase/cdp-sdk";

async function main() {
  const cdp = new CdpClient();
  const account = await cdp.evm.createAccount();

  const fundOperation = await account.fund({
    network: "base",
    token: "usdc",
    amount: 1000000n, // 1 USDC
  });


  const completedTransfer = await account.waitForFundOperationReceipt({
    transferId: fundOperation.transfer.id,
  });

  console.log(completedTransfer);
}

main().catch(console.error);
