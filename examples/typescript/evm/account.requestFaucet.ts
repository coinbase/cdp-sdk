// Usage: pnpm tsx evm/account.requestFaucet.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({ name: "MyAccount" });
const { transactionHash } = await account.requestFaucet({
  network: "base-sepolia",
  token: "eth",
});

console.log(
  `Request faucet funds. Explorer link: https://sepolia.basescan.org/tx/${transactionHash}`
);
