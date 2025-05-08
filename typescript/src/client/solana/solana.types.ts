import { Account, SolanaAccount } from "../../accounts/solana/types.js";
import { OpenApiSolanaMethods, UpdateSolanaAccountBody } from "../../openapi-client/index.js";

/**
 * The SolanaClient type, where all OpenApiSolanaMethods methods are wrapped.
 */
export type SolanaClientInterface = Omit<
  typeof OpenApiSolanaMethods,
  | "createSolanaAccount" // mapped to createAccount
  | "getSolanaAccount" // mapped to getAccount
  | "getSolanaAccountByName" // mapped to getAccount
  | "updateSolanaAccount" // mapped to updateAccount
  | "listSolanaAccounts" // mapped to listAccounts
  | "requestSolanaFaucet" // mapped to requestFaucet
  | "signSolanaMessage" // mapped to signMessage
  | "signSolanaTransaction" // mapped to signTransaction
  | "updateSolanaAccount" // mapped to updateAccount
> & {
  createAccount: (options: CreateAccountOptions) => Promise<Account>;
  getAccount: (options: GetAccountOptions) => Promise<Account>;
  getOrCreateAccount: (options: GetOrCreateAccountOptions) => Promise<Account>;
  updateAccount: (options: UpdateSolanaAccountOptions) => Promise<Account>;
  listAccounts: (options: ListAccountsOptions) => Promise<ListAccountsResult>;
  requestFaucet: (options: RequestFaucetOptions) => Promise<SignatureResult>;
  signMessage: (options: SignMessageOptions) => Promise<SignatureResult>;
  signTransaction: (options: SignTransactionOptions) => Promise<SignatureResult>;
};

/**
 * A Solana signature result.
 */
export interface SignatureResult {
  /** The signature. */
  signature: string;
}

/**
 * Options for creating a Solana account.
 */
export interface CreateAccountOptions {
  /** The name of the account. */
  name?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for getting a Solana account.
 */
export interface GetAccountOptions {
  /** The address of the account. */
  address?: string;
  /** The name of the account. */
  name?: string;
}

/**
 * Options for getting a Solana account.
 */
export interface GetOrCreateAccountOptions {
  /** The name of the account. */
  name: string;
}

/**
 * Options for creating a SOL server account.
 */
export interface UpdateSolanaAccountOptions {
  /** The address of the account. */
  address: string;
  /** The updates to apply to the account */
  update: UpdateSolanaAccountBody;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for listing Solana accounts.
 */
export interface ListAccountsOptions {
  /** The page size. */
  pageSize?: number;
  /** The page token. */
  pageToken?: string;
}

/**
 * The result of listing Solana accounts.
 */
export interface ListAccountsResult {
  /** The accounts. */
  accounts: SolanaAccount[];
  /**
   * The token for the next page of accounts, if any.
   */
  nextPageToken?: string;
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

/**
 * Options for signing a Solana message.
 */
export interface SignMessageOptions {
  /** The address of the account. */
  address: string;
  /** The message to sign. */
  message: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for signing a Solana transaction.
 */
export interface SignTransactionOptions {
  /** The address of the account. */
  address: string;
  /** The base64 encoded transaction to sign. */
  transaction: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}
