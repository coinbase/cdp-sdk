// Usage: pnpm tsx src/examples/evm/signHash.ts

import { config } from "dotenv";

import { CdpClient } from "../../index";

/**
 * This example shows how to sign an EVM hash.
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const ethAccount = await cdp.evm.createAccount({});

  console.log("EVM Account Address: ", ethAccount.address);

  const signature = await cdp.evm.signHash({
    address: ethAccount.address,
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234",
  });

  console.log("Signature: ", signature);
}

main().catch(console.error);
