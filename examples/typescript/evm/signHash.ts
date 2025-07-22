// Usage: pnpm tsx evm/signHash.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

console.log("Created account:", account.address);

const signature = await cdp.evm.signHash({
  address: account.address,
  hash: "0x1234567890123456789012345678901234567890123456789012345678901234",
});

console.log("Signature:", signature);
