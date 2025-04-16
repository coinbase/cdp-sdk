// Usage: pnpm tsx src/examples/evm/sendUserOperation.ts

import { config } from "dotenv";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { parseEther } from "viem";

import { CdpClient } from "../../index";

/**
 * This example shows how to send a user operation
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const privateKey = generatePrivateKey();
  const owner = privateKeyToAccount(privateKey);

  const smartAccount = await cdp.evm.createSmartAccount({
    owner,
  });

  const userOperationResult = await cdp.evm.sendUserOperation({
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

  console.log("User Operation Result:", userOperationResult);
}

main().catch(console.error);
