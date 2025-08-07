import {
  CdpClient,
  parseUnits,
  type SpendPermissionInput,
} from "@coinbase/cdp-sdk";

import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateSmartAccount({
  name: "Demo-SpendPermissions-Account",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Demo-SpendPermissions-Account-Owner",
  }),
  enableSpendPermissions: true,
});

const spender = await cdp.evm.getOrCreateSmartAccount({
  name: "Demo-SpendPermissions-Spender",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Demo-SpendPermissions-Spender-Owner",
  }),
});

console.log("Account:", account.address);
console.log("Spender account:", spender.address);

if (process.argv.includes("--faucet")) {
  await account.requestFaucet({
    network: "base-sepolia",
    token: "usdc",
  });
}

const spendPermission: SpendPermissionInput = {
  account: account.address, // User's smart wallet address
  spender: spender.address, // App's spender address
  token: "usdc", // USDC on base-sepolia
  allowance: parseUnits("0.01", 6), // Small amount for testing
  periodInDays: 1, // 1 day
};

console.log("Sending approve user operation...");
const { userOpHash } = await cdp.evm.createSpendPermission({
  network: "base-sepolia",
  spendPermission,
});
console.log("Approve user operation sent", userOpHash);

const result = await account.waitForUserOperation({
  userOpHash,
});

console.log(
  `Received approval receipt. Status: ${result.status}. Waiting 2 seconds...`
);

// sleep 2 seconds
await new Promise((resolve) => setTimeout(resolve, 2000));

// List spend permissions to get the actual resolved permission
const allPermissions = await cdp.evm.listSpendPermissions({
  address: account.address,
});
const permissions = allPermissions.spendPermissions.filter(
  (p) => p.permission.spender.toLowerCase() === spender.address.toLowerCase()
);

if (permissions.length === 0) {
  console.log("No spend permissions found");
  process.exit(1);
}

console.log("Executing spend...");

const spend = await spender.useSpendPermission({
  spendPermission: permissions.at(-1)!.permission, // Use the latest permission
  value: parseUnits("0.005", 6), // 0.005 USDC (half the allowance)
  network: "base-sepolia",
});

console.log("Spend sent, waiting for receipt...");

await spender.waitForUserOperation(spend);

const spendReceipt = await spender.getUserOperation(spend);

console.log(
  "Spend completed!",
  `https://sepolia.basescan.org/tx/${spendReceipt.transactionHash}`
);
