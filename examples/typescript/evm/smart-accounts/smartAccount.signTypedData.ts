// Usage: pnpm tsx evm/smart-accounts/smartAccount.signTypedData.ts
// Demonstrates how to sign typed data with a smart account after sending
// an initial user operation which also deploys the smart account.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const owner = await cdp.evm.getOrCreateAccount({
  name: "SignTypedData-Example-Owner",
});

const smartAccount = await cdp.evm.getOrCreateSmartAccount({
  owner,
  name: "SignTypedData-Example-SmartAccount",
});

console.log("Created smart account:", smartAccount.address);

const userOperation = await smartAccount.sendUserOperation({
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: BigInt(0),
    },
  ],
  network: "base-sepolia",
});

const userOperationResult = await cdp.evm.waitForUserOperation({
  userOpHash: userOperation.userOpHash,
  smartAccountAddress: smartAccount.address,
});

console.log("User Operation Result:", userOperationResult);

const signature = await smartAccount.signTypedData({
  domain: {
    name: "Test",
    chainId: 84532,
    verifyingContract: "0x0000000000000000000000000000000000000000",
  },
  types: {
    Test: [{ name: "name", type: "string" }],
  },
  primaryType: "Test",
  message: {
    name: "John Doe",
  },
  network: "base-sepolia",
});

console.log("Signature:", signature);
