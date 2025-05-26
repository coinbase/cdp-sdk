// Usage: pnpm tsx evm/smartAccount.fund.ts

import { CdpClient } from "../../../typescript/src/index.js";

async function main() {
  const cdp = new CdpClient();

  const account = await cdp.evm.createAccount();
  const smartAccount = await cdp.evm.createSmartAccount({ owner: account });

  const fundOperation = await smartAccount.fund({
    network: "base",
    token: "usdc",
    amount: 1000000n, // 1 USDC
  });


  const completedTransfer = await smartAccount.waitForFundOperationReceipt({
    transferId: fundOperation.transfer.id,
  });

  console.log(completedTransfer);
}

main().catch(console.error);
