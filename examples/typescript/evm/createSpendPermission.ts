import { CdpClient, SpendPermission } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient({
  apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
  apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
  walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
  basePath: "https://cloud-api-dev.cbhq.net/platform",
  debugging: true,
});

const owner = await cdp.evm.createAccount();

const smartAccount = await cdp.evm.createSmartAccount({
  owner,
  __experimental_enableSpendPermission: true,
});

const spender = await cdp.evm.createAccount();

const spendPermission: SpendPermission = {
  account: smartAccount.address,
  spender: spender.address,
  token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  allowance: parseEther("0.00001"),
  period: 86400,
  start: 0,
  end: 281474976710655,
  salt: BigInt(0),
  extraData: "0x",
};

const { userOpHash } = await cdp.evm.createSpendPermission({
  spendPermission,
  network: "base-sepolia",
});

const userOperationResult = await cdp.evm.getUserOperation({
  smartAccount,
  userOpHash,
});

console.log("User Operation:", userOperationResult);
