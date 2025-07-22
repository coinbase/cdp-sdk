// Usage: pnpm tsx evm/sendTransactionWithViem.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { createWalletClient, http, createPublicClient, parseEther } from "viem";
import { toAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Step 1: Create a new EVM account.
const account = await cdp.evm.createAccount();
console.log("Successfully created EVM account:", account.address);

// Step 2: Request ETH from the faucet.
const { transactionHash: faucetTransactionHash } = await cdp.evm.requestFaucet({
  address: account.address,
  network: "base-sepolia",
  token: "eth",
});

const faucetTxReceipt = await publicClient.waitForTransactionReceipt({
  hash: faucetTransactionHash,
});
console.log(
  "Successfully requested ETH from faucet:",
  faucetTxReceipt.transactionHash
);

const walletClient = createWalletClient({
  account: toAccount(account),
  chain: baseSepolia,
  transport: http(),
});

// Step 3: Sign the transaction with CDP and broadcast it using the wallet client.
const hash = await walletClient.sendTransaction({
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  value: parseEther("0.000001"),
});

console.log(
  `Transaction explorer link: https://sepolia.basescan.org/tx/${hash}`
);
