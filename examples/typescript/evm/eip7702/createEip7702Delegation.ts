// Usage: pnpm tsx evm/eip7702/createEip7702Delegation.ts
//
// Creates an EIP-7702 delegation for an EOA account (upgrading it with smart account
// capabilities), waits for the transaction to be confirmed, then sends a user operation
// using cdp.evm.toDelegatedAccount(account).

import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Step 1: Get or create an EOA account
const account = await cdp.evm.getOrCreateAccount({ name: "EIP7702-Example-Account-1121" });
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
}

// Step 3: Create the EIP-7702 delegation
console.log("Creating EIP-7702 delegation...");
await new Promise(resolve => setTimeout(resolve, 1000));
const { transactionHash } = await cdp.evm.createEvmEip7702Delegation(account.address, {
  network: "base-sepolia",
  enableSpendPermissions: false,
});

console.log("Delegation transaction submitted:", transactionHash);

// Step 4: Wait for the transaction to be confirmed onchain
console.log("Waiting for transaction confirmation...");
const receipt = await publicClient.waitForTransactionReceipt({
  hash: transactionHash,
});

console.log(
  `Delegation confirmed in block ${receipt.blockNumber}. Explorer: https://sepolia.basescan.org/tx/${transactionHash}`
);

// Step 5: Send a user operation using the upgraded EOA (via toDelegatedAccount)
console.log("Sending user operation with upgraded EOA...");
await new Promise(resolve => setTimeout(resolve, 2000));
const delegated = cdp.evm.toDelegatedAccount(account);
const { userOpHash } = await delegated.sendUserOperation({
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
console.log(
  `Check status: https://base-sepolia.blockscout.com/op/${userOpHash}`,
);
