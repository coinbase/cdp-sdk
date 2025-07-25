import {
  CdpClient,
  parseUnits,
  SpendPermission,
  parseEther,
  spendPermissionManagerAddress,
  spendPermissionManagerAbi,
} from "@coinbase/cdp-sdk";
import { encodeFunctionData } from "viem";

import "dotenv/config";

const cdp = new CdpClient();

const masterOwner = await cdp.evm.getOrCreateAccount({
  name: "Demo-SpendPermissions-Master-Owner",
});
const master = await cdp.evm.getOrCreateSmartAccount({
  name: "Demo-SpendPermissions-Master",
  owner: masterOwner,
  __experimental_enableSpendPermission: true,
});

const spenderOwner = await cdp.evm.getOrCreateAccount({
  name: "Demo-SpendPermissions-Spender-Owner",
});
const spender = await cdp.evm.getOrCreateSmartAccount({
  name: "Demo-SpendPermissions-Spender",
  owner: spenderOwner,
});

console.log("Master account:", master.address);
console.log("Spender account:", spender.address);

const spendPermission: SpendPermission = {
  account: master.address, // User's smart wallet address
  spender: spender.address, // App's spender address
  token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on base-sepolia
  allowance: parseUnits("0.01", 6), // Small amount for testing
  period: 86400, // 1 day in seconds
  start: 0, // Start immediately
  end: 281474976710655, // Max uint48 (effectively no end)
  salt: 0n,
  extraData: "0x",
};

console.log("Sending approve user operation...");
const { userOpHash } = await master.sendUserOperation({
  network: "base-sepolia",
  calls: [
    {
      to: spendPermissionManagerAddress,
      data: encodeFunctionData({
        abi: spendPermissionManagerAbi,
        functionName: "approve",
        args: [spendPermission],
      }),
      value: parseEther("0"),
    },
  ],
});
console.log("Approve user operation sent", userOpHash);

const result = await master.waitForUserOperation({
  userOpHash,
});

console.log(
  `Received approval receipt. Status: ${result.status}. Waiting 2 seconds...`
);

// sleep 2 seconds
await new Promise((resolve) => setTimeout(resolve, 2000));

console.log("Executing spend...");

const spend = await spender.__experimental_useSpendPermission({
  spendPermission,
  value: parseUnits("0.01", 6), // 0.01 USDC
  network: "base-sepolia",
});

const spendReceipt = await spender.waitForUserOperation(spend);

console.log("Spend sent, waiting for receipt...", spendReceipt.userOpHash);

const spendUserOp = await spender.getUserOperation({
  userOpHash: spendReceipt.userOpHash,
});

console.log(
  "Spend completed!",
  `https://sepolia.basescan.org/tx/${spendUserOp.transactionHash}`
);
