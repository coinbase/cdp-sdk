// Usage: pnpm tsx evm/getUserOperation.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const cdp = new CdpClient();

const privateKey = generatePrivateKey();
const owner = privateKeyToAccount(privateKey);

const smartAccount = await cdp.evm.createSmartAccount({
  owner,
});

const { userOpHash } = await cdp.evm.prepareUserOperation({
  smartAccount,
  network: "base-sepolia",
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0"),
      data: "0x",
    },
  ],
});

const userOperationResult = await cdp.evm.getUserOperation({
  smartAccount,
  userOpHash,
});

console.log("User Operation:", userOperationResult);
