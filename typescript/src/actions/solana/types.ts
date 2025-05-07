/**
 * A Solana signature result.
 */
export interface SignatureResult {
  /** The signature. */
  signature: string;
}

/**
 * Options for requesting funds from a Solana faucet.
 */
export interface RequestFaucetOptions {
  /** The address of the account. */
  address: string;
  /** The token to request funds for. */
  token: "sol" | "usdc";
  /** The idempotency key. */
  idempotencyKey?: string;
}

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
   * const result = await account.requestFaucet({
   *   token: "sol",
   * });
   * ```
   */
  requestFaucet: (options: Omit<RequestFaucetOptions, "address">) => Promise<SignatureResult>;
};
