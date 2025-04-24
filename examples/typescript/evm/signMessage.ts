// Usage: pnpm tsx evm/signMessage.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const ethAccount = await cdp.evm.createAccount({});

console.log("EVM Account Address: ", ethAccount.address);

const signature = await cdp.evm.signMessage({
  address: ethAccount.address,
  message: "Hello, world!",
});

console.log("Signature: ", signature);
