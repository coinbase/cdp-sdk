import {
  RequestFaucetOptions,
  SignatureResult,
  SignMessageOptions,
} from "../../client/solana/solana.types.js";

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
   * const signature = await account.signMessage({
   *   message: "Hello, world!",
   * });
   * ```
   */
  signMessage: (options: Omit<SignMessageOptions, "address">) => Promise<SignatureResult>;
};
export { SignatureResult, RequestFaucetOptions };
