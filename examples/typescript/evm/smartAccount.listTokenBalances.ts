// Usage: pnpm tsx evm/smartAccount.listTokenBalances.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({ name: "MyAccount" });
const smartAccount = await cdp.evm.createSmartAccount({
  owner: account,
});

const { transactionHash } = await cdp.evm.requestFaucet({
  address: smartAccount.address,
  network: "base-sepolia",
  token: "eth",
});

await createPublicClient({
  transport: http(),
  chain: baseSepolia,
}).waitForTransactionReceipt({
  hash: transactionHash,
});

const result = await smartAccount.listTokenBalances({
  network: "base-sepolia",
});

for (const balance of result.balances) {
  console.log("Token contract address:", balance.token.contractAddress);
  console.log("Token balance:", balance.amount.amount);
}
