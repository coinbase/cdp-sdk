// Usage: pnpm tsx solana/signAndSendVersionedTransaction.ts [sourceAddress]

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * This script will:
 * 1. Either use a provided Solana address or create a new one
 * 2. If a new account is created, requests SOL from CDP faucet
 * 3. Signs a transaction with CDP to send SOL to a destination address
 * 4. Broadcasts the signed transaction
 *
 * @param {string} [sourceAddress] - The source address to use
 * @returns A promise that resolves when the transaction is confirmed
 */
async function main(sourceAddress?: string) {
  const cdp = new CdpClient();

  // Required: Destination address to send SOL to
  const destinationAddress = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE";

  // Amount of lamports to send (default: 1000 = 0.000001 SOL)
  const lamportsToSend = 1000;

  try {
    const connection = new Connection("https://api.devnet.solana.com");

    let fromAddress: string;
    if (sourceAddress) {
      fromAddress = sourceAddress;
      console.log("Using existing SOL account:", fromAddress);
    } else {
      const account = await cdp.solana.createAccount({
        name: "test-sol-account",
      });

      fromAddress = account.address;
      console.log("Successfully created new SOL account:", fromAddress);

      // Request SOL from faucet
      const faucetResp = await cdp.solana.requestFaucet({
        address: fromAddress,
        token: "sol",
      });
      console.log(
        "Successfully requested SOL from faucet:",
        faucetResp.signature
      );
    }

    // Wait until the address has balance
    let balance = 0;
    let attempts = 0;
    const maxAttempts = 30;

    while (balance === 0 && attempts < maxAttempts) {
      balance = await connection.getBalance(new PublicKey(fromAddress));
      if (balance === 0) {
        console.log("Waiting for funds...");
        await sleep(1000);
        attempts++;
      }
    }

    if (balance === 0) {
      throw new Error("Account not funded after multiple attempts");
    }

    console.log("Account funded with", balance / 1e9, "SOL");

    if (balance < lamportsToSend) {
      throw new Error(
        `Insufficient balance: ${balance} lamports, need at least ${lamportsToSend} lamports`
      );
    }

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Create a TransactionMessage instead of Transaction
    const instructions = [
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(destinationAddress),
        lamports: lamportsToSend,
      }),
    ];

    // Create the message with instructions, payer, and blockhash
    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(fromAddress),
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    // Create the versioned transaction
    const versionedTransaction = new VersionedTransaction(messageV0);

    // Serialize the transaction to send to CDP
    const serializedTx = Buffer.from(versionedTransaction.serialize()).toString(
      "base64"
    );

    console.log("Transaction serialized successfully");

    const signedTxResponse = await cdp.solana.signTransaction({
      address: fromAddress,
      transaction: serializedTx,
    });

    const decodedSignedTx = Buffer.from(signedTxResponse.signature, "base64");

    const signature = await connection.sendRawTransaction(decodedSignedTx, {
      skipPreflight: false,
      maxRetries: 3,
    });
    console.log("Solana transaction hash:", signature);

    console.log("Waiting for transaction to be confirmed");
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${confirmation.value.err.toString()}`
      );
    }

    console.log(
      "Transaction confirmed:",
      confirmation.value.err ? "failed" : "success"
    );
    console.log(
      `Transaction explorer link: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );

    return {
      fromAddress,
      destinationAddress,
      amount: lamportsToSend / 1e9,
      signature,
      success: !confirmation.value.err,
    };
  } catch (error) {
    console.error("Error processing SOL transaction:", error);
    throw error;
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

const sourceAddress = process.argv.length > 2 ? process.argv[2] : undefined;

main(sourceAddress).catch(console.error);
