// Usage: pnpm tsx evm/requestFaucet.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();
const faucetResult = await cdp.evm.requestFaucet({
  address: account.address,
  network: "base-sepolia",
  token: "eth",
});

console.log("Faucet Result: ", faucetResult);
