// Usage: pnpm tsx evm/sendManyTransactions.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import {
  serializeTransaction,
  parseEther,
  createPublicClient,
  http,
  Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

import { env } from "node:process";

// import { APIError } from "@coinbase/cdp-sdk/openapi-client/errors.js";

const NUM_TRANSACTIONS = Number(env.NUM_TRANSACTIONS || 10);

/**
 * This script demonstrates sending multiple concurrent transactions to test nonce assignment:
 * 1. Create a new ethereum account on CDP
 * 2. Request ETH from CDP faucet
 * 3. Send 10 concurrent transactions and track their resolution order
 */
async function main() {
  const cdp = new CdpClient();
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  // Step 1: Create a new EVM account
  const account = await cdp.evm.createAccount();
  console.log("Successfully created EVM account:", account.address);

  // Step 2: Request ETH from the faucet
  const { transactionHash } = await cdp.evm.requestFaucet({
    address: account.address,
    network: "base-sepolia",
    token: "eth",
  });

  console.log("Successfully requested ETH from faucet:", transactionHash);

  // Wait for the faucet transaction to be confirmed onchain.
  const faucetTxReceipt = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  console.log("Faucet transaction confirmed:", faucetTxReceipt.transactionHash);

  // Step 3: Create and send NUM_TRANSFERS  concurrent transactions
  const transactions: Promise<{ txHash: Hex; index: number }>[] = [];

  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const serializedTx = serializeTransaction({
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8", // recipient address
      value: parseEther("0.000001"), // sending 0.000001 ETH
      chainId: baseSepolia.id,
      type: "eip1559",
    });

    // Create a promise that will resolve with the transaction hash and its index
    const txPromise = (async (index: number) => {
      let retryCount = 0;
      const MAX_RETRIES = 10;
      const BASE_DELAY = 1000; // 1 second

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const txResult = await cdp.evm.sendTransaction({
            address: account.address,
            network: "base-sepolia",
            transaction: serializedTx,
          });

          return { txHash: txResult.transactionHash, index };
        } catch (error) {
          if (
            // error instanceof APIError &&
            // error.errorType === "rate_limit_exceeded" &&
            retryCount < MAX_RETRIES
          ) {
            // Add jitter between 0 and 0.5 of the base delay
            const jitter = Math.random() * (BASE_DELAY / 2);
            const delay = BASE_DELAY * Math.pow(2, retryCount) + jitter;

            console.log(
              `Rate limit exceeded for transaction #${index}, retrying in ${Math.round(
                delay
              )}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
            );

            await sleep(delay);
            retryCount++;
          } else {
            throw error;
          }
        }
      }
    })(i);

    transactions.push(txPromise);
  }

  console.log(`Sent ${NUM_TRANSACTIONS} concurrent transactions`);

  // Step 4: Wait for all transactions to be confirmed

  // Create a promise for each transaction that waits for its receipt
  const receiptPromises = transactions.map(async (txPromise) => {
    const { txHash, index } = await txPromise;
    console.log(`Transaction #${index} sent with hash: ${txHash}`);
    console.log(`Waiting for receipt of transaction #${index}...`);

    // Wait for the transaction to be confirmed

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      console.log(`Transaction #${index} confirmed!`);
      console.log(`- Block Number: ${receipt.blockNumber}`);
      console.log(`- Gas Used: ${receipt.gasUsed}`);
      console.log(`- Status: ${receipt.status}`);
      return { receipt, index };
    } catch {
      console.log(`Transaction #${index} timed out waiting for receipt`);
      return { receipt: null, index };
    }
  });

  // Wait for all receipt promises to resolve
  const results = await Promise.all(receiptPromises);

  // Log summary
  const successfulTxs = results.filter((r) => r.receipt !== null);
  const failedTxs = results.filter((r) => r.receipt === null);

  console.log("\nTransaction Summary:");
  console.log(`Total transactions: ${results.length}`);
  console.log(`Successful transactions: ${successfulTxs.length}`);
  console.log(`Failed/timed out transactions: ${failedTxs.length}`);

  if (successfulTxs.length > 0) {
    console.log("\nSuccessful transactions in order of confirmation:");
    successfulTxs
      .sort((receiptA, receiptB) => {
        const a = receiptA.receipt!.blockNumber;
        const b = receiptB.receipt!.blockNumber;

        // For same block numbers, sort by nonce.
        if (a === b) {
          return receiptA.index - receiptB.index;
        }

        return a < b ? -1 : 1;
      })
      .forEach(({ receipt, index }) => {
        console.log(
          `Block Number: ${receipt!.blockNumber} - Transaction #${index}`
        );
      });
  }
}

/**
 * Sleeps for a given number of milliseconds
 *
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves when the sleep is complete
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
