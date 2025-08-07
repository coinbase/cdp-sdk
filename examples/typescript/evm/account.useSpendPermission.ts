import { CdpClient, parseUnits } from "@coinbase/cdp-sdk";

import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateSmartAccount({
  name: "Demo-SpendPermissions-Account",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Demo-SpendPermissions-Account-Owner",
  }),
  enableSpendPermissions: true,
});

const spender = await cdp.evm.getOrCreateAccount({
  name: "Demo-SpendPermissions-EOA-Spender",
});

const baseSpender = await spender.useNetwork("base-sepolia");

console.log("Account:", account.address);
console.log("Spender account:", spender.address);

if (process.argv.includes("--faucet")) {
  // Fund the spender with ETH for gas
  const faucet = await baseSpender.requestFaucet({
    token: "eth",
  });
  console.log("Faucet transaction sent:", faucet.transactionHash);

  const txReceipt = await baseSpender.waitForTransactionReceipt(faucet);
  console.log("Faucet transaction completed:", txReceipt.transactionHash);
}

console.log("Creating spend permission...");
const createSpendResult = await cdp.evm.createSpendPermission({
  network: "base-sepolia",
  spendPermission: {
    account: account.address,
    spender: spender.address,
    token: "usdc",
    allowance: parseUnits("0.01", 6),
    periodInDays: 1,
  },
});

const createSpendReceipt = await account.waitForUserOperation(
  createSpendResult
);
if (createSpendReceipt.status === "failed") {
  console.log(
    "Failed to create spend permission:",
    createSpendReceipt.userOpHash
  );
  process.exit(1);
}

console.log("Spend permission created");

// Sleep 2 seconds
await new Promise((resolve) => setTimeout(resolve, 2000));

// List spend permissions to get the actual resolved permission
const allPermissions = await cdp.evm.listSpendPermissions({
  address: account.address,
});
const permissions = allPermissions.spendPermissions.filter(
  (p) => p.permission.spender.toLowerCase() === spender.address.toLowerCase()
);

console.log("Executing spend...");

// Use the spend permission
const spend = await baseSpender.useSpendPermission({
  spendPermission: permissions.at(-1)!.permission, // Use the latest permission
  value: parseUnits("0.005", 6), // Spend 0.005 USDC (half the allowance)
});

console.log("Spend sent, waiting for receipt...");

const spendReceipt = await baseSpender.waitForTransactionReceipt(spend);

console.log("Spend completed!");
console.log(
  "Transaction:",
  `https://sepolia.basescan.org/tx/${spendReceipt.transactionHash}`
);
