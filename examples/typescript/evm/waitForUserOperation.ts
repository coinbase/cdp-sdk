// Usage: pnpm tsx evm/waitForUserOperation.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { parseEther } from "viem";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();
const smartAccount = await cdp.evm.createSmartAccount({ owner: account });

await cdp.evm.requestFaucet({
  address: smartAccount.address,
  network: "base-sepolia",
  token: "eth",
});

console.log("Sleeping for 5 seconds to allow for faucet to be processed");
await new Promise((resolve) => setTimeout(resolve, 5000));

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
