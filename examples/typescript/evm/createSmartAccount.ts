// Usage: pnpm tsx evm/createSmartAccount.ts

import { CdpClient, parseEther } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const cdp = new CdpClient({
  apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
  apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
  walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
  basePath: "https://cloud-api-dev.cbhq.net/platform",
  debugging: true,
});

const account = await cdp.evm.createAccount();
const secondAccount = await cdp.evm.createAccount();

const smartAccount = await cdp.evm.createSmartAccount({
  owners: [account, secondAccount],
});

const {userOpHash} = await cdp.evm.sendUserOperation({
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

console.log("User Operation Hash:", userOpHash);

await new Promise(resolve => setTimeout(resolve, 10000));

const userOperationResult = await cdp.evm.getUserOperation({
  smartAccount,
  userOpHash,
});

console.log("User Operation Result:", userOperationResult);
