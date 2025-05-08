// Usage: pnpm tsx solana/account.signMessage.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.solana.getOrCreateAccount({ name: "MyAccount" });
const { signature } = await account.signMessage({
  message: "Hello, world!",
});

console.log(
  `Sign message. Explorer link: https://sepolia.basescan.org/tx/${signature}`
);
