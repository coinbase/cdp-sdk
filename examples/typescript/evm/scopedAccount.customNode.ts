// Usage: pnpm tsx evm/scopedAccount.customNode.ts
// Make sure to set NODE_RPC_URL in your .env file

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { parseEther } from "viem";

if (!process.env.NODE_RPC_URL) {
  console.log("NODE_RPC_URL is not set");
  process.exit(1);
}

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({
  name: "Playground-Account",
});

const baseAccount = await account.useNetwork<"base-sepolia">(
  process.env.NODE_RPC_URL as "base-sepolia"
);

const { transactionHash: faucetTransactionHash } =
  await baseAccount.requestFaucet({
    token: "eth",
  });

await baseAccount.waitForTransactionReceipt({
  hash: faucetTransactionHash,
});

console.log("Faucet transaction receipt:", faucetTransactionHash);

const hash = await baseAccount.sendTransaction({
  transaction: {
    to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
    value: parseEther("0.000001"),
  },
});

console.log("Transaction hash:", hash);

const receipt = await baseAccount.waitForTransactionReceipt({
  hash: hash.transactionHash,
});

console.log("Transaction receipt:", receipt);
