/**
 * @module Actions
 */

import { SendTransactionResult } from "./sendTransaction.js";
import { TransferOptions } from "./transfer.js";
import {
  RequestFaucetOptions,
  SendTransactionOptions,
  SignatureResult,
  SignMessageOptions,
  SignTransactionOptions,
} from "../../client/solana/solana.types.js";

import type { SignTransactionResult } from "./signTransaction.js";

export type AccountActions = {
  /**
   * Requests funds from a Solana faucet.
   *
   * @param {RequestFaucetOptions} options - Parameters for requesting funds from the Solana faucet.
   * @param {string} options.token - The token to request funds for.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the transaction hash.
   *
   * @example
   * ```ts
   * // Create a Solana account
   * const account = await cdp.solana.createAccount();
   *
   * // Request funds from the Solana faucet
   * const result = await account.requestFaucet({
   *   token: "sol",
   * });
   * ```
   */
  requestFaucet: (options: Omit<RequestFaucetOptions, "address">) => Promise<SignatureResult>;

  /**
   * Signs a message.
   *
   * @param {SignMessageOptions} options - Parameters for signing the message.
   * @param {string} options.address - The address to sign the message for.
   * @param {string} options.message - The message to sign.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the signature.
   *
   * @example
   * ```ts
   * // Create a Solana account
   * const account = await cdp.solana.createAccount();
   *
   * // Sign a message
   * const { signature } = await account.signMessage({
   *   message: "Hello, world!",
   * });
   * ```
   */
  signMessage: (options: Omit<SignMessageOptions, "address">) => Promise<SignatureResult>;

  /**
   * Signs a transaction.
   *
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
   * const { signedTransaction } = await account.signTransaction({
   *   transaction,
   * });
   * ```
   */
  signTransaction: (
    options: Omit<SignTransactionOptions, "address">,
  ) => Promise<SignTransactionResult>;

  /**
   * Sends a transaction.
   *
   * @param {SendTransactionOptions} options - Parameters for sending the transaction.
   * @param {string} options.address - The address to send the transaction for.
   * @param {string} options.transaction - The transaction to send.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the transaction signature.
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
   * const { transactionSignature } = await account.sendTransaction({
   *   transaction,
   * });
   * ```
   */
  sendTransaction: (
    options: Omit<SendTransactionOptions, "address">,
  ) => Promise<SendTransactionResult>;

  /**
   * Transfers SOL or SPL tokens between accounts
   *
   * @param {TransferOptions} options - Parameters for the transfer.
   * @param {string} options.to - The base58 encoded Solana address of the destination account.
   * @param {sol|usdc|string} options.token - The token to transfer ("sol" or "usdc"), or mint address of the SPL token to transfer.
   * @param {bigint} options.amount - The amount to transfer in atomic units of the token. For example, 0.01 * LAMPORTS_PER_SOL would transfer 0.01 SOL.
   * @param {string | Connection} options.network - The network identifier to use, or a Solana Connection object.
   *
   * @returns A promise that resolves to the transaction signature, which can be used to wait for the transaction result.
   *
   * @example
   * ```ts
   * import { LAMPORTS_PER_SOL } from "@solana/web3.js";
   *
   * const account = await cdp.solana.getAccount({ name: "Account" });
   *
   * const { signature } = await account.transfer({
   *   token: "sol",
   *   amount: 5 * LAMPORTS_PER_SOL,
   *   to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
   *   network: "devnet",
   * });
   * ```
   */
  transfer: (options: Omit<TransferOptions, "from">) => Promise<SignatureResult>;
};
