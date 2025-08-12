// Usage: pnpm tsx evm/transactions/baseAccount.transfer.ts

import { CdpClient, parseEther } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({
  name: "Playground-Account",
});

const baseAccount = await account.useNetwork("base-sepolia");

const faucetTx =
  await baseAccount.requestFaucet({
    token: "eth",
});

await baseAccount.waitForTransactionReceipt(faucetTx);

console.log("Faucet transaction receipt:", faucetTx);

const transfer = await baseAccount.transfer({
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  amount: parseEther("0.000001"),
  token: "eth",
});

console.log("Transaction hash:", transfer.transactionHash);

const receipt = await baseAccount.waitForTransactionReceipt(transfer);

console.log("Transaction receipt:", receipt);
