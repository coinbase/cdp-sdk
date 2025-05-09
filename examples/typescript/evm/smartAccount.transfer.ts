// Usage: pnpm tsx evm/smartAccount.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const cdp = new CdpClient();

const sender = await cdp.evm.createSmartAccount({
  owner: privateKeyToAccount(generatePrivateKey()),
});

const receiver = await cdp.evm.getOrCreateAccount({ name: "Receiver" });

console.log(
  `Transferring 0 USDC from ${sender.address} to ${receiver.address}...`
);

const transfer = await sender.transfer({
  to: receiver,
  amount: "0",
  token: "usdc",
  network: "base-sepolia",
});

const finalizedTransfer = await transfer.waitForResult();

console.log(`Transfer status: ${finalizedTransfer.status}`);
console.log(
  `Explorer link: https://sepolia.basescan.org/tx/${finalizedTransfer.transactionHash}`
);
