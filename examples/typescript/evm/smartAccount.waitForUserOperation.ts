// Usage: pnpm tsx evm/smartAccount.waitForUserOperation.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { createPublicClient, http, parseEther, Calls } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();
const smartAccount = await cdp.evm.createSmartAccount({ owner: account });
console.log("Created smart account:", smartAccount.address);

const { transactionHash } = await smartAccount.requestFaucet({
  network: "base-sepolia",
  token: "eth",
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const faucetTxReceipt = await publicClient.waitForTransactionReceipt({
  hash: transactionHash,
});
console.log("Faucet transaction confirmed:", faucetTxReceipt.transactionHash);

const destinationAddresses = [
  "0xba5f3764f0A714EfaEDC00a5297715Fd75A416B7",
  "0xD84523e4F239190E9553ea59D7e109461752EC3E",
  "0xf1F7Bf05A81dBd5ACBc701c04ce79FbC82fEAD8b",
];

const calls = destinationAddresses.map((destinationAddress) => ({
  to: destinationAddress,
  value: parseEther("0.000001"),
  data: "0x",
}));

console.log("Sending user operation to three destinations...");
const { userOpHash } = await smartAccount.sendUserOperation({
  network: "base-sepolia",
  calls: calls as Calls<unknown[]>,
});

console.log("Waiting for user operation to be confirmed...");
const userOperationResult = await smartAccount.waitForUserOperation({
  userOpHash,
});

if (userOperationResult.status === "failed") {
  console.log("User operation failed.");
} else if (userOperationResult.status === "complete") {
  console.log(
    "User operation completed with transaction hash:",
    userOperationResult.transactionHash
  );
}
