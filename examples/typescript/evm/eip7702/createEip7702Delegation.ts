// Usage: pnpm tsx evm/eip7702/createEip7702Delegation.ts
//
// Creates an EIP-7702 delegation for an EOA account (upgrading it with smart account
// capabilities), waits for the transaction to be confirmed, then sends a user operation
// using account.toDelegated().

import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, Hex, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Step 1: Get or create an EOA account
const account = await cdp.evm.getOrCreateAccount({ name: "EIP7702-Example-Account-10" });
console.log("Account address:", account.address);

// Step 2: Ensure the account has ETH for gas (request faucet if needed)
const balance = await publicClient.getBalance({ address: account.address });
if (balance === 0n) {
  const { transactionHash: faucetTxHash } = await cdp.evm.requestFaucet({
    address: account.address,
    network: "base-sepolia",
    token: "eth",
  });

  await publicClient.waitForTransactionReceipt({ hash: faucetTxHash });

  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Step 3: Create the EIP-7702 delegation
console.log("Creating EIP-7702 delegation...");
const result = await cdp.evm.createEvmEip7702Delegation(account.address, {
  network: "base-sepolia",
  enableSpendPermissions: false,
});

console.log("Delegation transaction submitted:", result.transactionHash);

// Step 4: Wait for the transaction to be confirmed onchain
console.log("Waiting for transaction confirmation...");
const receipt = await publicClient.waitForTransactionReceipt({
  hash: result.transactionHash as Hex,
});

console.log(
  `Delegation confirmed in block ${receipt.blockNumber}. Explorer: https://sepolia.basescan.org/tx/${result.transactionHash}`
);

// Step 5: Send a user operation using the upgraded EOA (via toDelegated())
console.log("Sending user operation with upgraded EOA...");
const delegated = await account.toDelegated();
console.log("Delegated account:", delegated);
await new Promise(resolve => setTimeout(resolve, 1000));

const userOpResult = await delegated.sendUserOperation({
  network: "base-sepolia",
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0"),
      data: "0x",
    },
  ],
});

console.log("User operation submitted:", userOpResult.userOpHash);
console.log(
  "Check status: https://sepolia.basescan.org/address/%s#internaltx",
  account.address
);
