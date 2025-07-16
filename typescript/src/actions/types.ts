import { TransferStatus } from "../openapi-client/index.js";

/**
 * Base options for getting a quote to fund an account.
 */
export interface BaseQuoteFundOptions {
  /** The address of the account. */
  address: string;
  /** The amount to fund the account with, in atomic units (e.g. wei for ETH, lamports for SOL) of the token. */
  amount: bigint;
}

/**
 * Base options for funding an account.
 */
export interface BaseFundOptions {
  /** The address of the account. */
  address: string;
  /** The amount to fund the account with, in atomic units (e.g. wei for ETH, lamports for SOL) of the token. */
  amount: bigint;
}

/**
 * The result of a fund operation.
 */
export type FundOperationResult = {
  /** The transfer that was created to fund the account. */
  id: string;
  /** The network that the transfer was created on. */
  network: string;
  /** The target amount that will be received. */
  targetAmount: string;
  /** The currency that will be received. */
  targetCurrency: string;
  /** The status of the fund operation. */
  status: TransferStatus;
  /** The transaction hash of the transfer. */
  transactionHash?: string;
};
