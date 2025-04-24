// Usage: pnpm tsx evm/signHash.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const ethAccount = await cdp.evm.createAccount({});

console.log("EVM Account Address: ", ethAccount.address);

const signature = await cdp.evm.signHash({
  address: ethAccount.address,
  hash: "0x1234567890123456789012345678901234567890123456789012345678901234",
});

console.log("Signature: ", signature);
