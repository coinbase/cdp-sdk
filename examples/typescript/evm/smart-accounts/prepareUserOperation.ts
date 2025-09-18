// Usage: pnpm tsx evm/smart-accounts/prepareUserOperation.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient();

const owner = await cdp.evm.getOrCreateAccount({ name: "SmartAccountOwner" });

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
