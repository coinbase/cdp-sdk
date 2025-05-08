// Usage: pnpm tsx evm/smartAccount.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const sender = await cdp.evm.createSmartAccount({
  owner: privateKeyToAccount(generatePrivateKey()),
});

const receiver = await cdp.evm.getOrCreateAccount({ name: "Receiver" });

console.log("Requesting USDC from faucet...");

const { transactionHash: faucetTransactionHash } = await sender.requestFaucet({
  network: "base-sepolia",
  token: "usdc",
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

await publicClient.waitForTransactionReceipt({
  hash: faucetTransactionHash,
});

console.log(
  `Received USDC from faucet. Explorer link: https://sepolia.basescan.org/tx/${faucetTransactionHash}`
);

console.log(
  `Transferring 0.01 USDC from ${sender.address} to ${receiver.address}...`
);

const { userOpHash } = await sender.transfer({
  to: receiver,
  amount: 10000n, // equivalent to 0.01 USDC
  token: "usdc",
  network: "base-sepolia",
});

const receipt = await sender.waitForUserOperation({
  userOpHash,
});

console.log(`Transfer status: ${receipt.status}`);
if (receipt.status === "complete") {
  console.log(
    `Transfer successful! Explorer link: https://sepolia.basescan.org/tx/${receipt.userOpHash}`
  );
} else {
  console.log(
    `Something went wrong! User operation hash: ${receipt.userOpHash}`
  );
}
