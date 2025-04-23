// Usage: pnpm tsx src/examples/evm/sendTransaction.ts

import { config } from "dotenv";
import { parseEther, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

import { CdpClient } from "../../index.js";

/**
 * This script demonstrates using the new sendTransaction API to:
 * 1. Create a new ethereum account on CDP
 * 2. Request ETH from CDP faucet
 * 3. Sign and send a transaction in a single API call.
 */
async function main() {
  config();

  const cdp = new CdpClient({ basePath: process.env.CDP_API_URL });
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

  // Step 1: Create a new EVM account
  const serverAccount = await cdp.evm.createAccount();
  console.log("Successfully created EVM account:", serverAccount.address);

  // Step 2: Request ETH from the faucet
  const faucetResp = await cdp.evm.requestFaucet({
    address: serverAccount.address,
    network: "base-sepolia",
    token: "eth",
  });

  // Wait for the faucet transaction to be confirmed onchain.
  const faucetTxReceipt = await publicClient.waitForTransactionReceipt({
    hash: faucetResp.transactionHash,
  });

  console.log("Successfully requested ETH from faucet:", faucetTxReceipt.transactionHash);

  // Step 3: Sign and send the transaction in a single step with sendTransaction.
  const txResult = await cdp.evm.sendTransaction({
    address: serverAccount.address,
    network: "base-sepolia",
    transaction: {
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8", // recipient address
      value: parseEther("0.000001"), // sending 0.000001 ETH
    },
  });

  console.log("Transaction sent successfully!");
  console.log(
    `Transaction explorer link: https://sepolia.basescan.org/tx/${txResult.transactionHash}`,
  );

  await publicClient.waitForTransactionReceipt({ hash: txResult.transactionHash });

  console.log("Transaction confirmed!");
}

main().catch(console.error);
