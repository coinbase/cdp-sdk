// Usage: pnpm tsx evm/account.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const sender = await cdp.evm.getOrCreateAccount({ name: "Sender" });
const receiver = await cdp.evm.getOrCreateAccount({ name: "Receiver" });

console.log("Requesting USDC and ETH from faucet...");

const [usdcFaucetResult, ethFaucetResult] = await Promise.all([
  cdp.evm.requestFaucet({
    address: sender.address,
    network: "base-sepolia",
    token: "usdc",
  }),
  cdp.evm.requestFaucet({
    address: sender.address,
    network: "base-sepolia",
    token: "eth",
  }),
]);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

await publicClient.waitForTransactionReceipt({
  hash: usdcFaucetResult.transactionHash,
});

await publicClient.waitForTransactionReceipt({
  hash: ethFaucetResult.transactionHash,
});

console.log(
  `Received USDC from faucet. Explorer link: https://sepolia.basescan.org/tx/${usdcFaucetResult.transactionHash}`
);
console.log(
  `Received ETH from faucet. Explorer link: https://sepolia.basescan.org/tx/${ethFaucetResult.transactionHash}`
);

console.log(
  `Sending 0.01 USDC from ${sender.address} to ${receiver.address}...`
);

const { transactionHash } = await sender.transfer({
  to: receiver,
  amount: 10000n, // equivalent to 0.01 USDC
  token: "usdc",
  network: "base-sepolia",
});

const receipt = await publicClient.waitForTransactionReceipt({
  hash: transactionHash,
});

console.log(`Transfer status: ${receipt.status}`);
console.log(
  `Explorer link: https://sepolia.basescan.org/tx/${receipt.transactionHash}`
);
