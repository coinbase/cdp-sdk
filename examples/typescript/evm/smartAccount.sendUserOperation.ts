// Usage: pnpm tsx evm/smartAccount.sendUserOperation.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const cdp = new CdpClient();

const privateKey = generatePrivateKey();
const owner = privateKeyToAccount(privateKey);

const smartAccount = await cdp.evm.createSmartAccount({
  owner,
});

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

const userOperationResult = await smartAccount.sendUserOperation({
  network: "base-sepolia",
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0"),
      data: "0x",
    },
  ],
});

console.log("User Operation Result:", userOperationResult);
