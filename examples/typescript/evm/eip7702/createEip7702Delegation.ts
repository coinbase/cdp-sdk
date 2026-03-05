// Usage: pnpm tsx evm/eip7702/createEip7702Delegation.ts
//
// Creates an EIP-7702 delegation for an EOA account (upgrading it with smart account
// capabilities), waits for the delegation operation to complete, then sends a user operation
// using toEvmDelegatedAccount(account).

import { CdpClient, toEvmDelegatedAccount } from "@coinbase/cdp-sdk";
import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Step 1: Get or create an EOA account
const account = await cdp.evm.getOrCreateAccount({ name: "EIP7702-Example-Account" });
console.log("Account address:", account.address);

// Step 2: Ensure the account has ETH for gas (request faucet if needed)
const balance = await publicClient.getBalance({ address: account.address });
if (balance === 0n) {
  console.log("Requesting ETH from faucet...");
  const { transactionHash: faucetTxHash } = await cdp.evm.requestFaucet({
    address: account.address,
    network: "base-sepolia",
    token: "eth",
  });

  await publicClient.waitForTransactionReceipt({ hash: faucetTxHash });
  console.log("Faucet transaction confirmed.");
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Step 3: Create the EIP-7702 delegation
console.log("Creating EIP-7702 delegation...");
const { delegationOperationId } = await cdp.evm.createEvmEip7702Delegation({
  address: account.address,
  network: "base-sepolia",
  enableSpendPermissions: false,
});

console.log("Delegation operation created:", delegationOperationId);

// Step 4: Wait for the delegation operation to complete
console.log("Waiting for delegation to complete...");
const delegationOperation = await cdp.evm.waitForEvmEip7702DelegationOperationStatus({
  delegationOperationId,
});

console.log(
  `Delegation is complete (status: ${delegationOperation.status}). Explorer: https://sepolia.basescan.org/tx/${delegationOperation.transactionHash}`,
);

// Step 5: Send a user operation using the upgraded EOA (via toEvmDelegatedAccount)
console.log("Sending user operation with upgraded EOA...");
const delegatedAccount = toEvmDelegatedAccount(account);
const { userOpHash } = await delegatedAccount.sendUserOperation({
  network: "base-sepolia",
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0"),
      data: "0x",
    },
  ],
});

console.log("User operation submitted:", userOpHash);
console.log(`Check status: https://base-sepolia.blockscout.com/op/${userOpHash}`);
