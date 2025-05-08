// Usage: pnpm tsx solana/signTransaction.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

/**
 * This example shows how to sign a message using a Solana wallet
 */
async function main() {
  const cdp = new CdpClient();

  let address: string;
  try {
    const account = await cdp.solana.createAccount();
    console.log("Successfully created Solana account:", account.address);
    address = account.address;
  } catch (error) {
    console.error("Error creating Solana account:", error);
    return;
  }

  const signature = await cdp.solana.signTransaction({
    address,
    transaction: createAndEncodeTransaction(address),
  });

  console.log("Successfully signed message:", signature);
}

/**
 * Creates and encodes a Solana transaction.
 *
 * @param address - The address of the sender.
 * @returns The base64 encoded transaction.
 */
function createAndEncodeTransaction(address: string) {
  const recipientKeypair = Keypair.generate();
  const recipientAddress = recipientKeypair.publicKey;

  const fromPubkey = new PublicKey(address);

  const transferAmount = 0.01 * LAMPORTS_PER_SOL;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: recipientAddress,
      lamports: transferAmount,
    })
  );

  transaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
  transaction.feePayer = fromPubkey;

  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
  });

  return Buffer.from(serializedTransaction).toString("base64");
}

main().catch(console.error);
