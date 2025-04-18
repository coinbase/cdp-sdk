import type {
  EvmUserOperationNetwork,
  EvmUserOperationStatus,
  OpenApiEvmMethods,
} from "../../openapi-client";
import {
  EvmAccount as Account,
  EvmServerAccount as ServerAccount,
  EvmSmartAccount as SmartAccount,
} from "../../accounts/types";
import { Call, Calls } from "../../types/calls";
import { Address, Hex } from "../../types/misc";
import { WaitOptions } from "../../utils/wait";
import { SendUserOperationReturnType } from "../../actions/evm/sendUserOperation";

/**
 * The EvmClient type, where all OpenApiEvmMethods methods are wrapped.
 */
export type EvmClientInterface = Omit<
  typeof OpenApiEvmMethods,
  | "createEvmAccount" // mapped to createAccount
  | "createEvmSmartAccount" // mapped to createSmartAccount
  | "getEvmAccount" // mapped to getAccount
  | "getEvmAccountByName" // mapped to getAccount
  | "getEvmSmartAccount" // mapped to getSmartAccount
  | "getUserOperation"
  | "listEVMBalances" // omit
  | "listEvmAccounts" // mapped to listAccounts
  | "listEvmSmartAccounts" // mapped to listSmartAccounts
  | "prepareUserOperation"
  | "requestEvmFaucet" // mapped to requestFaucet
  | "sendUserOperation"
  | "signEvmHash" // mapped to signHash
  | "signEvmMessage" // mapped to signMessage
  | "signEvmTransaction" // mapped to signTransaction
> & {
  createAccount: (options: CreateServerAccountOptions) => Promise<ServerAccount>;
  createSmartAccount: (options: CreateSmartAccountOptions) => Promise<SmartAccount>;
  getAccount: (options: GetServerAccountOptions) => Promise<ServerAccount>;
  getSmartAccount: (options: GetSmartAccountOptions) => Promise<SmartAccount>;
  getUserOperation: (options: GetUserOperationOptions) => Promise<UserOperation>;
  listAccounts: (options: ListServerAccountsOptions) => Promise<ListServerAccountResult>;
  listSmartAccounts: (options: ListSmartAccountsOptions) => Promise<ListSmartAccountResult>;
  prepareUserOperation: (options: PrepareUserOperationOptions) => Promise<UserOperation>;
  requestFaucet: (options: RequestFaucetOptions) => Promise<RequestFaucetResult>;
  sendUserOperation: (options: SendUserOperationOptions) => Promise<SendUserOperationReturnType>;
  signHash: (options: SignHashOptions) => Promise<SignatureResult>;
  signMessage: (options: SignMessageOptions) => Promise<SignatureResult>;
  signTransaction: (options: SignTransactionOptions) => Promise<SignatureResult>;
};

export type { ServerAccount, SmartAccount };

/**
 * Options for getting a user operation.
 */
export interface GetUserOperationOptions {
  /** The smart account. */
  smartAccount: SmartAccount;
  /** The user operation hash. */
  userOpHash: Hex;
}

/**
 * Options for preparing a user operation.
 */
export interface PrepareUserOperationOptions {
  /** The smart account. */
  smartAccount: SmartAccount;
  /** The network. */
  network: EvmUserOperationNetwork;
  /** The calls. */
  calls: Calls<EvmCall[]>;
  /** The paymaster URL. */
  paymasterUrl?: string;
}

/**
 * A call to be executed in a user operation.
 */
export interface EvmCall {
  /**
   * The address the call is directed to.
   */
  to: Address;
  /** The amount of ETH to send with the call, in wei. */
  value: bigint;
  /**
   * The call data to send. This is the hex-encoded data of the function call consisting of the method selector and the function arguments.
   */
  data: Hex;
}

/**
 * A user operation.
 */
export interface UserOperation {
  /** The network the user operation is for. */
  network: EvmUserOperationNetwork;
  /**
   * The hash of the user operation. This is not the transaction hash, as a transaction consists of multiple user operations. The user operation hash is the hash of this particular user operation which gets signed by the owner of the Smart Account.
   */
  userOpHash: Hex;
  /** The list of calls in the user operation. */
  calls: Calls<EvmCall[]>;
  /** The status of the user operation. */
  status: EvmUserOperationStatus;
  /**
   * The hash of the transaction that included this particular user operation. This gets set after the user operation is broadcasted and the transaction is included in a block.
   */
  transactionHash?: Hex;
}

/**
 * Options for creating an EVM server account.
 */
export interface CreateServerAccountOptions {
  /** The name of the account. */
  name?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for getting an EVM account.
 */
export interface GetServerAccountOptions {
  /** The address of the account. */
  address?: Address;
  /** The name of the account. */
  name?: string;
}

/**
 * Options for getting an EVM smart account.
 */
export interface GetSmartAccountOptions {
  /** The address of the account. */
  address: Address;
  /** The owner of the account. */
  owner: Account;
}

/**
 * Options for listing EVM accounts.
 */
export interface ListServerAccountsOptions {
  /** The page size to paginate through the accounts. */
  pageSize?: number;
  /** The page token to paginate through the accounts. */
  pageToken?: string;
}

/**
 * A smart account that only contains the owner address.
 */
export interface ReadonlySmartAccount extends Omit<SmartAccount, "owners"> {
  /** The owners of the smart account. */
  owners: Address[];
}

/**
 * The result of listing EVM smart accounts.
 */
export interface ListSmartAccountResult {
  /** The accounts. */
  accounts: ReadonlySmartAccount[];
  /**
   * The next page token to paginate through the accounts.
   * If undefined, there are no more accounts to paginate through.
   */
  nextPageToken?: string;
}

/**
 * The result of listing EVM server accounts.
 */
export interface ListServerAccountResult {
  /** The accounts. */
  accounts: ServerAccount[];
  /**
   * The next page token to paginate through the accounts.
   * If undefined, there are no more accounts to paginate through.
   */
  nextPageToken?: string;
}

/**
 * Options for listing EVM smart accounts.
 */
export interface ListSmartAccountsOptions {
  /** The name of the account. */
  name?: string;
  /** The page size to paginate through the accounts. */
  pageSize?: number;
  /** The page token to paginate through the accounts. */
  pageToken?: string;
}

/**
 * Options for creating an EVM smart account.
 */
export interface CreateSmartAccountOptions {
  /** The owner of the account. */
  owner: Account;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for requesting funds from an EVM faucet.
 */
export interface RequestFaucetOptions {
  /** The address of the account. */
  address: string;
  /** The network to request funds from. */
  network: "base-sepolia" | "ethereum-sepolia";
  /** The token to request funds for. */
  token: "eth" | "usdc" | "eurc" | "cbbtc";
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * The result of requesting funds from an EVM faucet.
 */
export interface RequestFaucetResult {
  /** The transaction hash. */
  transactionHash: Hex;
}

/**
 * Options for sending a user operation.
 */
export interface SendUserOperationOptions {
  /** The smart account. */
  smartAccount: SmartAccount;
  /** The network. */
  network: EvmUserOperationNetwork;
  /** The calls. */
  calls: Call[];
  /** The paymaster URL. */
  paymasterUrl?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for signing an EVM hash.
 */
export interface SignHashOptions {
  /** The address of the account. */
  address: Address;
  /** The hash to sign. */
  hash: Hex;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for signing an EVM message.
 */
export interface SignMessageOptions {
  /** The address of the account. */
  address: Address;
  /** The message to sign. */
  message: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for signing an EVM transaction.
 */
export interface SignTransactionOptions {
  /** The address of the account. */
  address: Address;
  /** The RLP-encoded transaction to sign, as a 0x-prefixed hex string. */
  transaction: Hex;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * A signature result.
 */
export interface SignatureResult {
  /** The signature. */
  signature: Hex;
}

/**
 * Options for waiting for a user operation.
 */
export interface WaitForUserOperationOptions {
  /** The smart account address. */
  smartAccountAddress: Address;
  /** The user operation hash. */
  userOpHash: Hex;
  /** The wait options. */
  waitOptions?: WaitOptions;
}
