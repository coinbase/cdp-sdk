import { Connection } from "@solana/web3.js";

import { getOrCreateConnection, type Network } from "./utils.js";

export interface WaitForTransactionConfirmationOptions {
  /**
   * The signature of the transaction to wait for
   */
  signature: string;
  /**
   * The network or connection to use
   */
  network: Network | Connection;
}

export interface ConfirmationResult {
  /**
   * The signature of the transaction
   */
  signature: string;
}

/**
 * Wait for a transaction to be confirmed on the Solana blockchain
 *
 * @param options - The options for the transaction confirmation
 * @param options.signature - The signature of the transaction to wait for
 * @throws {Error} If the transaction fails to confirm
 *
 * @returns The confirmation result
 */
export async function waitForTransactionConfirmation(
  options: WaitForTransactionConfirmationOptions,
): Promise<ConfirmationResult> {
  const connection = getOrCreateConnection({ networkOrConnection: options.network });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const confirmation = await connection.confirmTransaction({
    signature: options.signature,
    blockhash,
    lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
  }

  return { signature: options.signature };
}
