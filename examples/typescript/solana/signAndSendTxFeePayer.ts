// Usage: pnpm tsx solana/signAndSendTransaction.ts [sourceAddress]

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

async function main(sourceAddress?: string) {
  const cdp = new CdpClient();

  // Required: Destination address to send SOL to
  const destinationAddress = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE";

  // Amount of lamports to send (default: 1000 = 0.000001 SOL)
  const lamportsToSend = 1000;

  try {
    const connection = new Connection("https://api.devnet.solana.com");

    const feePayer = await cdp.solana.getOrCreateAccount({
      name: "test-sol-account-relayer",
    });
    console.log("Fee payer address: " + feePayer.address);

    // Request funds on the feePayer address.
    await requestFaucetAndWaitForBalance(cdp, feePayer.address, connection);

    let fromAddress: string;
    if (sourceAddress) {
      fromAddress = sourceAddress;
      console.log("Using existing SOL account:", fromAddress);
    } else {
      const account = await cdp.solana.getOrCreateAccount({
        name: "test-sol-account",
      })

      fromAddress = account.address;
      console.log("Successfully created new SOL account:", fromAddress);

      // Request funds to send on the from address.
      await requestFaucetAndWaitForBalance(cdp, fromAddress, connection);
    }

    const balance = await connection.getBalance(new PublicKey(fromAddress));
    if (balance < lamportsToSend) {
      throw new Error(
        `Insufficient balance: ${balance} lamports, need at least ${lamportsToSend} lamports`
      );
    }

    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(destinationAddress),
        lamports: lamportsToSend,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(feePayer.address);

    const serializedTx = Buffer.from(
      transaction.serialize({ requireAllSignatures: false })
    ).toString("base64");

    // Sign with the funding account.
    const signedTxResponse = await cdp.solana.signTransaction({
      address: fromAddress,
      transaction: serializedTx,
    });

    const signedBase64Tx = signedTxResponse.signature; // base64

    // Sign with the feePayer account.
    const finalSignedTxResponse = await cdp.solana.signTransaction({
      address: feePayer.address,
      transaction: signedBase64Tx,
    });

    // Send the signed transaction to the network.
    const signature = await connection.sendRawTransaction(Buffer.from(finalSignedTxResponse.signature, 'base64'));

    const latestBlockhash = await connection.getLatestBlockhash();

    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
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


/**
 * Requests funds from the faucet and waits for the balance to be available
 *
 * @param {CdpClient} cdp - The CDP client instance
 * @param {string} address - The address to fund
 * @param {Connection} connection - The Solana connection
 * @param {string} token - The token to request (default: "sol")
 * @returns {Promise<void>} A promise that resolves when the account is funded
 */
async function requestFaucetAndWaitForBalance(
    cdp: CdpClient,
    address: string,
    connection: Connection,
): Promise<void> {
  // Request funds from faucet
  const faucetResp = await cdp.solana.requestFaucet({
    address: address,
    token: "sol",
  });
  console.log(
      `Successfully requested SOL from faucet:`,
      faucetResp.signature
  );

  // Wait until the address has balance
  let balance = 0;
  let attempts = 0;
  const maxAttempts = 30;

  while (balance === 0 && attempts < maxAttempts) {
    balance = await connection.getBalance(new PublicKey(address));
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
  return;
}


const sourceAddress = process.argv.length > 2 ? process.argv[2] : undefined;

main(sourceAddress).catch(console.error);

