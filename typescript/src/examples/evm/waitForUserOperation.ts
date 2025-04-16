// Usage: pnpm tsx src/examples/evm/waitForUserOperation.ts

import { config } from "dotenv";
import { parseEther } from "viem";

import { CdpClient } from "../../index";

/**
 * This example shows how to create a new EVM server account, create a smart account,
 * and send a user operation
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const account = await cdp.evm.createAccount();
  const smartAccount = await cdp.evm.createSmartAccount({ owner: account });

  await cdp.evm.requestFaucet({
    address: smartAccount.address,
    network: "base-sepolia",
    token: "eth",
  });

  console.log("Sleeping for 5 seconds to allow for faucet to be processed");
  await new Promise(resolve => setTimeout(resolve, 5000));

  const { userOpHash } = await cdp.evm.sendUserOperation({
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

  const userOperationResult = await cdp.evm.waitForUserOperation({
    userOpHash,
    smartAccountAddress: smartAccount.address,
  });

  console.log("User Operation Result: ", userOperationResult);
}

main().catch(console.error);
