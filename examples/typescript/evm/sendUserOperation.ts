// Usage: pnpm tsx evm/sendUserOperation.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const cdp = new CdpClient({
  apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
  apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
  walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
  basePath: "https://cloud-api-dev.cbhq.net/platform",
  debugging: true,
});

const privateKey = generatePrivateKey();
const owner = privateKeyToAccount(privateKey);

const smartAccount = await cdp.evm.createSmartAccount({
  owners: [owner],
});

await cdp.evm.requestFaucet({
  address: smartAccount.address,
  network: "base-sepolia",
  token: "eth",
});

await new Promise(resolve => setTimeout(resolve, 10000));

const {userOpHash} = await cdp.evm.sendUserOperation({
  smartAccount,
  network: "base-sepolia",
  calls: [
    {
      to: smartAccount.address,
      value: parseEther("0"),
      data: "0x",
    }
  ]
});

await new Promise(resolve => setTimeout(resolve, 10000));

const [userOperationResult1, userOperationResult2] = await Promise.all([
  cdp.evm.sendUserOperation({
    smartAccount,
    network: "base-sepolia",
    calls: [
      {
        to: "0x0000000000000000000000000000000000000000",
        value: parseEther("0.0001"),
        data: "0x",
      },
    ],
  }),
  cdp.evm.sendUserOperation({
    smartAccount,
    network: "base-sepolia",
    calls: [
      {
        to: "0x0000000000000000000000000000000000000000",
        value: parseEther("0.00001"),
        data: "0x",
      },
    ],
  }),
]);

await new Promise(resolve => setTimeout(resolve, 10000));

for (const userOperationResult of [userOperationResult1, userOperationResult2]) {
  const userOperation = await cdp.evm.getUserOperation({
    smartAccount,
    userOpHash: userOperationResult.userOpHash,
  });
  console.log("User Operation:", userOperation);
  console.log("User Operation Result:", userOperationResult);
}

// const userOperationResult = await cdp.evm.sendUserOperation({
//   smartAccount,
//   network: "base-sepolia",
//   calls: [
//     {
//       to: "0x0000000000000000000000000000000000000000",
//       value: parseEther("0.000001"),
//       data: "0x",
//     },
//   ],
// });

// console.log("User Operation Result:", userOperationResult);
