// Usage: pnpm tsx evm/smartAccount.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const cdp = new CdpClient();

const sender = await cdp.evm.createSmartAccount({
  owner: privateKeyToAccount(generatePrivateKey()),
});

const receiver = await cdp.evm.createAccount({ name: "Receiver" });

console.log(
  `Transferring 0 USDC from ${sender.address} to ${receiver.address}...`
);

const { status, transactionHash } = await sender.transfer({
  to: receiver,
  amount: "0",
  token: "usdc",
  network: "base-sepolia",
});

console.log(`Transfer status: ${status}`);
console.log(
  `Explorer link: https://sepolia.basescan.org/tx/${transactionHash}`
);
