// Usage: pnpm tsx solana/account.requestFaucet.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.solana.getOrCreateAccount({ name: "MyAccount" });
const { signature } = await account.requestFaucet({
  token: "sol",
});

console.log(
  `Request faucet funds. Explorer link: https://sepolia.basescan.org/tx/${signature}`
);
