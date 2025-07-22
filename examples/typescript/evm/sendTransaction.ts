// Usage: pnpm tsx evm/sendTransaction.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { parseEther, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Step 1: Create a new EVM account
const account = await cdp.evm.createAccount();
console.log("Successfully created EVM account:", account.address);

// Step 2: Request ETH from the faucet
const { transactionHash: faucetTransactionHash } = await cdp.evm.requestFaucet({
  address: account.address,
  network: "base-sepolia",
  token: "eth",
});

// Wait for the faucet transaction to be confirmed onchain.
const faucetTxReceipt = await publicClient.waitForTransactionReceipt({
  hash: faucetTransactionHash,
});

console.log(
  "Successfully requested ETH from faucet:",
  faucetTxReceipt.transactionHash
);

// Step 3: Sign and send the transaction in a single step with sendTransaction.
const txResult = await cdp.evm.sendTransaction({
  address: account.address,
  network: "base-sepolia",
  transaction: {
    to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8", // recipient address
    value: parseEther("0.000001"), // sending 0.000001 ETH
  },
});

console.log(
  `Transaction hash: ${txResult.transactionHash}. Waiting for confirmation...`
);

await publicClient.waitForTransactionReceipt({
  hash: txResult.transactionHash,
});

console.log(
  `Transaction confirmed! link: https://sepolia.basescan.org/tx/${txResult.transactionHash}`
);
