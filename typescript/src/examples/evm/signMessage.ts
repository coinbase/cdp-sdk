// Usage: pnpm tsx src/examples/evm/signMessage.ts

import { config } from "dotenv";

import { CdpClient } from "../../index";

/**
 * This example shows how to sign an EVM message.
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const ethAccount = await cdp.evm.createAccount({});

  console.log("EVM Account Address: ", ethAccount.address);

  const signature = await cdp.evm.signMessage({
    address: ethAccount.address,
    message: "Hello, world!",
  });

  console.log("Signature: ", signature);
}

main().catch(console.error);
