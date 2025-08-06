import {
  CdpClient,
  parseUnits,
  type SpendPermissionInput,
} from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateSmartAccount({
  name: "Example-Account",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Example-Account-Owner",
  }),
  __experimental_enableSpendPermission: true,
});

const spender = await cdp.evm.createAccount();

console.log("Account Address:", account.address);
console.log("Spender Address:", spender.address);

const spendPermission: SpendPermissionInput = {
  account: account.address,
  spender: spender.address,
  token: "usdc",
  allowance: parseUnits("0.01", 6),
  periodInDays: 30, // monthly
};

const { userOpHash } = await cdp.evm.createSpendPermission({
  spendPermission,
  network: "base-sepolia",
});

const userOperationResult = await cdp.evm.waitForUserOperation({
  smartAccountAddress: account.address,
  userOpHash,
});

console.log("User Operation:", userOperationResult);
