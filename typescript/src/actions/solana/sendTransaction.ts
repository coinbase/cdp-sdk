import { SendTransactionOptions } from "../../client/solana/solana.types.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";

export interface SendTransactionResult {
  /** The signature of the transaction base58 encoded. */
  transactionSignature: string;
  /** @deprecated Use transactionSignature instead. */
  signature: string;
}

/**
 * Sends a Solana transaction using the Coinbase API.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client to use.
 * @param {SendTransactionOptions} options - Parameters for sending the Solana transaction.
 * @param {string} options.network - The network to send the transaction to.
 * @param {string} options.transaction - The base64 encoded transaction to send.
 * @param {string} [options.idempotencyKey] - An idempotency key.
 *
 * @returns A promise that resolves to the transaction result.
 *
 * @example
 * ```ts
 * const signature = await sendTransaction({
 *   network: "solana-devnet",
 *   transaction: "...",
 * });
 * ```
 */
export async function sendTransaction(
  apiClient: CdpOpenApiClientType,
  options: SendTransactionOptions,
): Promise<SendTransactionResult> {
  const signature = await apiClient.sendSolanaTransaction(
    {
      network: options.network,
      transaction: options.transaction,
    },
    options.idempotencyKey,
  );

  return {
    transactionSignature: signature.transactionSignature,
    signature: signature.transactionSignature,
  };
}
