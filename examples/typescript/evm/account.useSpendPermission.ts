import { CdpClient, parseUnits, SpendPermission } from "@coinbase/cdp-sdk";
import {
  SPEND_PERMISSION_MANAGER_ABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
} from "../../../typescript/src/spend-permissions/constants.js";
import "dotenv/config";
import { createPublicClient, encodeFunctionData, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const cdp = new CdpClient();

const owner = await cdp.evm.getOrCreateAccount({
  name: "SpendPermissions-Master-Owner-2",
});
const master = await cdp.evm.getSmartAccount({
  name: "SpendPermissions-Master-2",
  owner,
});

const spender = await cdp.evm.getOrCreateAccount({
  name: "SpendPermissions-Spender",
});

const spendPermission: SpendPermission = {
  account: master.address, // User's smart wallet address
  spender: spender.address, // App's spender address
  token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on base-sepolia
  allowance: parseUnits("0.01", 6), // Small amount for testing
  period: 86400, // 1 day in seconds
  start: 0, // Start immediately
  end: 281474976710655, // Max uint48 (effectively no end)
  salt: 5n,
  extraData: "0x",
};

const approveWithoutSignatureData = encodeFunctionData({
  abi: SPEND_PERMISSION_MANAGER_ABI,
  functionName: "approve",
  args: [spendPermission],
});

console.log("Sending approve user operation...");
const { userOpHash } = await master.sendUserOperation({
  network: "base-sepolia",
  calls: [
    {
      to: SPEND_PERMISSION_MANAGER_ADDRESS,
      data: approveWithoutSignatureData,
      value: parseEther("0"),
    },
  ],
});
console.log("Approve user operation sent", userOpHash);

const userOp = await master.waitForUserOperation({
  userOpHash,
});
userOp.status;

console.log("Received approval receipt. Waiting 2 seconds...");

// sleep 2 seconds
await new Promise((resolve) => setTimeout(resolve, 2000));

console.log("Doing the spend...");

const spendReceipt = await spender.useSpendPermission({
  spendPermission,
  value: parseUnits("0.01", 6), // 0.01 USDC
  network: "base-sepolia",
});

console.log("Spend sent, waiting for receipt...", spendReceipt.transactionHash);

await publicClient.waitForTransactionReceipt({
  hash: spendReceipt.transactionHash,
});

console.log(
  "Spend completed!",
  `https://sepolia.basescan.org/tx/${spendReceipt.transactionHash}`
);
