// Usage: pnpm tsx evm/getUserOperation.ts

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

const account = await cdp.evm.createAccount();

const SPEND_PERMISSION_MANAGER_ADDRESS = "0xf85210B21cC50302F477BA56686d2019dC9b67Ad"; // Base Sepolia address

const smartAccount = await cdp.evm.createSmartAccount({
  owners: [account, { address: SPEND_PERMISSION_MANAGER_ADDRESS }],
});

const spender = await cdp.evm.createAccount();

const { userOpHash } = await cdp.evm.createSpendPermission({
  account: smartAccount.address,
  spender: spender.address,
  network: "base-sepolia",
  token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  allowance: parseEther("0.00001").toString(),
  period: "86400",
  start: "0",
  end: "281474976710655",
  salt: "0",
  extraData: "0x",
  paymasterUrl: null as any,
});

console.log("User Operation Hash:", userOpHash);

await new Promise(resolve => setTimeout(resolve, 20000));

const userOperationResult = await cdp.evm.getUserOperation({
  smartAccount,
  userOpHash,
});

console.log("User Operation Result:", userOperationResult);

// await cdp.evm.sendTransaction({
//   address: spender.address,
//   transaction: {
//     to: "0x0000000000000000000000000000000000000000",
//     value: parseEther("0"),
//     data: "0x",
//   },
//   network: "base-sepolia",
// });


// const smartAccount = {address: "0x9691280A41d73FfC707F899Af366809A0A859666"} as any;
// const userOpHash = "0x453b34303efd6ee10c2c6dcb88c02b140734bb50f6771b4900388a2223526eef";

// const { userOpHash } = await cdp.evm.prepareUserOperation({
//   smartAccount,
//   network: "base-sepolia",
//   calls: [
//     {
//       to: "0x0000000000000000000000000000000000000000",
//       value: parseEther("0"),
//       data: "0x",
//     },
//   ],
// });

// const userOperationResult = await cdp.evm.getUserOperation({
//   smartAccount,
//   userOpHash,
// });

// console.log("User Operation:", userOperationResult);
