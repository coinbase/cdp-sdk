// Usage: pnpm tsx evm/baseAccount.sendTransaction.ts

import { CdpClient, parseEther } from "@coinbase/cdp-sdk";

import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({ name: "MyAccount" });
const baseAccount = await account.useNetwork("base-sepolia");

const { transactionHash: faucetTransactionHash } =
  await baseAccount.requestFaucet({
    token: "eth",
  });

const faucetTxReceipt = await baseAccount.waitForTransactionReceipt({
  hash: faucetTransactionHash,
});

console.log(
  "Successfully requested ETH from faucet:",
  faucetTxReceipt.transactionHash
);

const transaction = await baseAccount.sendTransaction({
  transaction: {
    to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
    value: parseEther("0.000001"),
  },
});

console.log("Transaction sent! Waiting for confirmation...");

const receipt = await baseAccount.waitForTransactionReceipt(transaction);

console.log("Transaction confirmed!", receipt);
console.log(
  `To view your transaction details, visit: https://sepolia.basescan.org/tx/${receipt.transactionHash}`
);
