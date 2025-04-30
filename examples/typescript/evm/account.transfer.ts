// Usage: pnpm tsx evm/account.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const cdp = new CdpClient();

const sender = await cdp.evm.createAccount({ name: "Sender" });
const receiver = await cdp.evm.createAccount({ name: "Receiver" });

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

const { status, transactionHash } = await sender.transfer({
  to: receiver,
  amount: "0.01",
  token: "usdc",
  network: "base-sepolia",
});

console.log(`Transfer status: ${status}`);
console.log(
  `Explorer link: https://sepolia.basescan.org/tx/${transactionHash}`
);
