// Usage: pnpm tsx src/examples/evm/prepareUserOperation.ts

import { config } from "dotenv";
import { parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { CdpClient } from "../../index";

/**
 * This example shows how to prepare a user operation
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const privateKey = generatePrivateKey();
  const owner = privateKeyToAccount(privateKey);

  const smartAccount = await cdp.evm.createSmartAccount({
    owner,
  });

  const userOperation = await cdp.evm.prepareUserOperation({
    smartAccount,
    network: "base-sepolia",
    calls: [
      {
        to: "0x0000000000000000000000000000000000000000",
        value: parseEther("0.000001"),
        data: "0x",
      },
    ],
  });

  console.log("User Operation:", userOperation);
}

main().catch(console.error);
