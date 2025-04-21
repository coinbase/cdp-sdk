import {
  OpenApiSolanaMethods,
  SolanaAccount as OpenAPISolanaAccount,
} from "../../openapi-client/index.js";
/**
 * The SolanaClient type, where all OpenApiSolanaMethods methods are wrapped.
 */
export type SolanaClientInterface = Omit<
  typeof OpenApiSolanaMethods,
  | "createSolanaAccount" // mapped to createAccount
  | "getSolanaAccount" // mapped to getAccount
  | "getSolanaAccountByName" // mapped to getAccount
  | "listSolanaAccounts" // mapped to listAccounts
  | "requestSolanaFaucet" // mapped to requestFaucet
  | "signSolanaMessage" // mapped to signMessage
  | "signSolanaTransaction" // mapped to signTransaction
> & {
  createAccount: (options: CreateAccountOptions) => Promise<Account>;
  getAccount: (options: GetAccountOptions) => Promise<Account>;
  listAccounts: (options: ListAccountsOptions) => Promise<ListAccountsResult>;
  requestFaucet: (options: RequestFaucetOptions) => Promise<SignatureResult>;
  signMessage: (options: SignMessageOptions) => Promise<SignatureResult>;
  signTransaction: (options: SignTransactionOptions) => Promise<SignatureResult>;
};
/**
 * A Solana account.
 */
export type Account = OpenAPISolanaAccount;

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
  accounts: Account[];
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

/**
 * A Solana signature result.
 */
export interface SignatureResult {
  /** The signature. */
  signature: string;
}
