// Usage: pnpm tsx evm/waitForUserOperation.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();
const smartAccount = await cdp.evm.createSmartAccount({ owner: account });
console.log("Created smart account:", smartAccount.address);

const { transactionHash } = await cdp.evm.requestFaucet({
  address: smartAccount.address,
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

const { userOpHash } = await cdp.evm.sendUserOperation({
  smartAccount,
  network: "base-sepolia",
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0.000001"),
      data: "0x",
    },
  ],
});

const userOperationResult = await cdp.evm.waitForUserOperation({
  userOpHash,
  smartAccountAddress: smartAccount.address,
});

console.log("User Operation Result:", userOperationResult);
