// Usage: pnpm tsx evm/signMessage.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

console.log("Created account:", account.address);

const signature = await cdp.evm.signMessage({
  address: account.address,
  message: "Hello, world!",
});

console.log("Signature:", signature);
