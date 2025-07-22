// Usage: pnpm tsx evm/scopedAccount.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const sender = await cdp.evm.getOrCreateAccount({ name: "Sender" });
const receiver = await cdp.evm.getOrCreateAccount({ name: "Receiver" });

const scopedSender = await sender.useNetwork("base-sepolia");

console.log("Requesting USDC and ETH from faucet...");

const [usdcFaucetResult, ethFaucetResult] = await Promise.all([
  scopedSender.requestFaucet({
    token: "usdc",
  }),
  scopedSender.requestFaucet({
    token: "eth",
  }),
]);

await scopedSender.waitForTransactionReceipt({
  hash: usdcFaucetResult.transactionHash,
});

await scopedSender.waitForTransactionReceipt({
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

const transfer = await scopedSender.transfer({
  to: receiver,
  amount: 10000n, // equivalent to 0.01 USDC
  token: "usdc",
});

const receipt = await scopedSender.waitForTransactionReceipt(transfer);

console.log(`Transfer status: ${receipt.status}`);
console.log(
  `Explorer link: https://sepolia.basescan.org/tx/${receipt.transactionHash}`
);
