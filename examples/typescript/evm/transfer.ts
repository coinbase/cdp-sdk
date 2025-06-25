// Usage: pnpm tsx evm/transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { parseEther } from "viem";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({
  name: "Playground-Account",
});

const baseAccount = await account.useNetwork("base-sepolia");

const { transactionHash: faucetTransactionHash } =
  await baseAccount.requestFaucet({
    token: "eth",
  });

await baseAccount.waitForTransactionReceipt({
  hash: faucetTransactionHash,
});

console.log("Faucet transaction receipt:", faucetTransactionHash);

const hash = await baseAccount.transfer({
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  amount: parseEther("0.000001"),
  token: "eth",
});

console.log("Transaction hash:", hash);

const receipt = await baseAccount.waitForTransactionReceipt({
  hash: hash.transactionHash,
});

console.log("Transaction receipt:", receipt);
