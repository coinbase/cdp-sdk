// Usage: pnpm tsx solana/transactions/signTransaction.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
  address as solanaAddress,
  appendTransactionMessageInstructions,
  Blockhash,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

const LAMPORTS_PER_SOL = 1_000_000_000;
const FAKE_BLOCKHASH =
  "SysvarRecentB1ockHashes11111111111111111111" as Blockhash;
const RECIPIENT_ADDRESS = "EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo";

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
 * @param fromAddress - The address of the sender.
 * @returns The base64 encoded transaction.
 */
function createAndEncodeTransaction(fromAddress: string) {
  const instruction = getTransferSolInstruction({
    source: createNoopSigner(solanaAddress(fromAddress)),
    destination: solanaAddress(RECIPIENT_ADDRESS),
    amount: BigInt(Math.round(0.01 * LAMPORTS_PER_SOL)),
  });

  const txMsg = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(solanaAddress(fromAddress), tx),
    (tx) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: FAKE_BLOCKHASH, lastValidBlockHeight: 9999999n },
        tx,
      ),
    (tx) => appendTransactionMessageInstructions([instruction], tx),
  );

  return getBase64EncodedWireTransaction(compileTransaction(txMsg));
}

main().catch(console.error);
