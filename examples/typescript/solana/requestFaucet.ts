// Usage: pnpm tsx solana/requestFaucet.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.solana.createAccount();

const { signature } = await cdp.solana.requestFaucet({
  address: account.address,
  token: "sol",
});

console.log("Successfully requested Solana faucet:", signature);
