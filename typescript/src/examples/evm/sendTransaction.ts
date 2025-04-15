// Usage: pnpm tsx src/examples/evm/sendTransaction.ts

import { config } from "dotenv";
import { toAccount } from "viem/accounts";
import { createWalletClient, http, createPublicClient } from "viem";
import { parseEther } from "viem";

import { CdpClient } from "../../index";

import { baseSepolia } from "viem/chains";

/**
 * This script will:
 * 1. Create a new ethereum account on CDP
 * 2. Requests ETH from CDP faucet
 * 3. Signs a transaction with CDP
 * 4. Broadcasts the signed transaction
 */
async function main() {
  config();

  const apiKeyId = process.env.CDP_API_KEY_NAME;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  const walletSecret = process.env.CDP_WALLET_SECRET;
  const basePath = process.env.CDP_API_URL;

  if (!apiKeyId || !apiKeySecret || !walletSecret) {
    throw new Error("Missing required environment variables");
  }

  const cdp = new CdpClient({
    apiKeyId,
    apiKeySecret,
    walletSecret,
    basePath,
  });

  try {
    const serverAccount = await cdp.evm.createAccount();
    console.log("Successfully created EVM account:", serverAccount.address);

    const faucetResp = await cdp.evm.requestFaucet({
      address: serverAccount.address,
      network: "base-sepolia",
      token: "eth",
    });
    console.log("Successfully requested ETH from faucet:", faucetResp.transactionHash);

    // Wait for the faucet transaction to be confirmed onchain.
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    console.log("Waiting for faucet funds...");
    let receipt;
    while (!receipt) {
      try {
        receipt = await publicClient.getTransactionReceipt({
          hash: faucetResp.transactionHash,
        });
      } catch (error) {
        await sleep(1000);
      }
    }
    console.log("Faucet transaction confirmed");

    const walletClient = createWalletClient({
      account: toAccount(serverAccount),
      chain: baseSepolia,
      transport: http(),
    });

    const hash = await walletClient.sendTransaction({
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
      value: parseEther("0.000001"),
    });

    console.log(`Transaction explorer link: https://sepolia.basescan.org/tx/${hash}`);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}

/**
 * Sleeps for a given number of milliseconds
 *
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves when the sleep is complete
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
