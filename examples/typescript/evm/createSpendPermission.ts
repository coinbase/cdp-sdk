import { CdpClient, SpendPermission } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient();

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

const userOperationResult = await cdp.evm.waitForUserOperation({
  smartAccountAddress: smartAccount.address,
  userOpHash,
});

console.log("User Operation:", userOperationResult);