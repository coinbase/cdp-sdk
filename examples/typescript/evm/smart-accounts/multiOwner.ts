// Usage: pnpm tsx evm/smart-accounts/multiOwner.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const cdpOwner1 = await cdp.evm.getOrCreateAccount({ name: "Owner-1" });
const cdpOwner2 = await cdp.evm.getOrCreateAccount({ name: "Owner-2" });

const smartAccount = await (
  await cdp.evm.getOrCreateSmartAccount({
    name: "MultiOwner",
    owners: [cdpOwner1, cdpOwner2],
    enableSpendPermissions: true,
  })
).useNetwork("base-sepolia");

console.log("Smart account address:", smartAccount.address);
console.log("Smart account owners:", smartAccount.owners);

const { userOpHash } = await smartAccount.sendUserOperation({
  calls: [
    {
      to: smartAccount.address,
      value: 0n,
    },
  ],
});

console.log("User operation hash with default owner:", userOpHash);

const userOpResult = await smartAccount.waitForUserOperation({
  userOpHash,
});

console.log("User operation result:", userOpResult);

const { userOpHash: userOpHash2 } = await smartAccount.sendUserOperation({
  calls: [
    {
      to: smartAccount.address,
      value: 0n,
    },
  ],
  signer: cdpOwner2,
});

console.log("User operation hash with second owner:", userOpHash2);

const userOpResult2 = await smartAccount.waitForUserOperation({
  userOpHash: userOpHash2,
});

console.log("User operation result with second owner:", userOpResult2);
