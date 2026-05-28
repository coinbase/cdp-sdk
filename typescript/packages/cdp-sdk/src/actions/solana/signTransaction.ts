import { SignTransactionOptions } from "../../client/solana/solana.types.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";

export interface SignTransactionResult {
  /** The signature of the transaction base58 encoded. */
  signedTransaction: string;
  /** @deprecated Use signedTransaction instead. */
  signature: string;
}

/**
 * Signs a transaction.
 *
 * @param apiClient - The API client.
 * @param {SignTransactionOptions} options - Parameters for signing the transaction.
 * @param {string} options.address - The address to sign the transaction for.
 * @param {string} options.transaction - The transaction to sign.
 * @param {string} [options.idempotencyKey] - An idempotency key.
 *
 * @returns A promise that resolves to the signature.
 *
 * @example
 * ```ts
 * // Create a Solana account
 * const account = await cdp.solana.createAccount();
 *
 * // Add your transaction instructions here
 * const transaction = new Transaction()
 *
 * // Make sure to set requireAllSignatures to false, since signing will be done through the API
 * const serializedTransaction = transaction.serialize({
 *   requireAllSignatures: false,
 * });
 *
 * // Base64 encode the serialized transaction
 * const transaction = Buffer.from(serializedTransaction).toString("base64");
 *
 * // When you want to sign a transaction, you can do so by address and base64 encoded transaction
 * const signature = await signTransaction(cdp.solana, {
 *   address: account.address,
 *   transaction,
 * });
 * ```
 */
export async function signTransaction(
  apiClient: CdpOpenApiClientType,
  options: SignTransactionOptions,
): Promise<SignTransactionResult> {
  const signature = await apiClient.signSolanaTransaction(
    options.address,
    {
      transaction: options.transaction,
    },
    options.idempotencyKey,
  );

  return {
    signedTransaction: signature.signedTransaction,
    signature: signature.signedTransaction,
  };
}
