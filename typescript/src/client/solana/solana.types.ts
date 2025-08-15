/**
 * @module Types
 */

import { Account, SolanaAccount } from "../../accounts/solana/types.js";
import {
  ListSolanaTokenBalancesNetwork,
  OpenApiSolanaMethods,
  SendSolanaTransactionBody,
  SendSolanaTransactionBodyNetwork,
  UpdateSolanaAccountBody,
} from "../../openapi-client/index.js";

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
  | "exportSolanaAccount" // mapped to exportAccount
  | "exportSolanaAccountByName" // mapped to exportAccount
  | "importSolanaAccount" // mapped to importAccount
  | "listSolanaTokenBalances" // mapped to listTokenBalances
  | "sendSolanaTransaction" // mapped to sendTransaction
> & {
  createAccount: (options: CreateAccountOptions) => Promise<Account>;
  exportAccount: (options: ExportAccountOptions) => Promise<string>;
  importAccount: (options: ImportAccountOptions) => Promise<SolanaAccount>;
  getAccount: (options: GetAccountOptions) => Promise<Account>;
  getOrCreateAccount: (options: GetOrCreateAccountOptions) => Promise<Account>;
  updateAccount: (options: UpdateSolanaAccountOptions) => Promise<Account>;
  listAccounts: (options: ListAccountsOptions) => Promise<ListAccountsResult>;
  requestFaucet: (options: RequestFaucetOptions) => Promise<SignatureResult>;
  signMessage: (options: SignMessageOptions) => Promise<SignatureResult>;
  signTransaction: (options: SignTransactionOptions) => Promise<SignatureResult>;
  listTokenBalances: (options: ListTokenBalancesOptions) => Promise<ListTokenBalancesResult>;
  sendTransaction: (options: SendSolanaTransactionBody) => Promise<SignatureResult>;
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
  /** The policy ID to apply to the account. */
  accountPolicy?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for exporting a Solana account.
 */
export interface ExportAccountOptions {
  /** The address of the account. */
  address?: string;
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

/**
 * Options for importing a Solana account.
 */
export interface ImportAccountOptions {
  /** The public RSA key used to encrypt the private key when importing a Solana account. */
  encryptionPublicKey?: string;
  /** The name of the account. */
  name?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
  /** The private key of the account - can be a base58 encoded string or raw bytes. */
  privateKey: string | Uint8Array;
}

/**
 * Options for listing Solana token balances.
 */
export interface ListTokenBalancesOptions {
  /** The address of the account. */
  address: string;
  /** The network to list token balances for. */
  network?: ListSolanaTokenBalancesNetwork;
  /** The page size. */
  pageSize?: number;
  /** The page token. */
  pageToken?: string;
}

/**
 * Options for sending a Solana transaction.
 */
export interface SendTransactionOptions {
  /** The network to send the transaction to. */
  network: SendSolanaTransactionBodyNetwork;
  /** The base64 encoded transaction to send. */
  transaction: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * The result of sending a Solana transaction.
 */
export interface TransactionResult {
  /** The signature of the transaction base58 encoded. */
  signature: string;
}

export interface SolanaTokenAmount {
  /** The amount of the token. */
  amount: bigint;
  /** The number of decimals in the token. */
  decimals: number;
}

export interface SolanaToken {
  /** The token address. */
  mintAddress: string;
  /** The token name. */
  name?: string;
  /** The token symbol. */
  symbol?: string;
}

/**
 * A Solana token balance.
 */
export interface SolanaTokenBalance {
  /** The amount of the token. */
  amount: SolanaTokenAmount;
  /** The token. */
  token: SolanaToken;
}

/**
 * The result of listing Solana token balances.
 */
export interface ListTokenBalancesResult {
  /** The token balances. */
  balances: SolanaTokenBalance[];
  /**
   * The next page token to paginate through the token balances.
   * If undefined, there are no more token balances to paginate through.
   */
  nextPageToken?: string;
}
