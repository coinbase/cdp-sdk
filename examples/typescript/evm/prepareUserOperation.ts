// Usage: pnpm tsx evm/prepareUserOperation.ts

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

const userOperation = await cdp.evm.prepareUserOperation({
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

console.log("User Operation:", userOperation);
