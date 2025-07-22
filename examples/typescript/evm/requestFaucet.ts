// Usage: pnpm tsx evm/requestFaucet.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();
const { transactionHash } = await cdp.evm.requestFaucet({
  address: account.address,
  network: "base-sepolia",
  token: "eth",
});

console.log(
  `Request faucet funds. Explorer link: https://sepolia.basescan.org/tx/${transactionHash}`
);
