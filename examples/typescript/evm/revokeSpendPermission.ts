import {
  CdpClient,
  parseUnits,
  type SpendPermissionInput,
} from "@coinbase/cdp-sdk";
import "dotenv/config";
import { Hex } from "viem";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateSmartAccount({
  name: "Example-Account-Revoke",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Example-Account-Revoke-Owner",
  }),
  __experimental_enableSpendPermission: true,
});

const spender = await cdp.evm.createAccount();

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

const permissions = await cdp.evm.listSpendPermissions({
  address: account.address,
});

const permissionHash = permissions.spendPermissions[0].permissionHash;

const { userOpHash: revokeUserOpHash } = await cdp.evm.revokeSpendPermission({
  address: account.address,
  permissionHash: permissionHash as Hex,
  network: "base-sepolia",
});

const revokeUserOperationResult = await cdp.evm.waitForUserOperation({
  smartAccountAddress: account.address,
  userOpHash: revokeUserOpHash,
});

console.log("Revoke User Operation:", revokeUserOperationResult);
