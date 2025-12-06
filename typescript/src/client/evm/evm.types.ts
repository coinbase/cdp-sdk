/**
 * @module Types
 */

import type {
  EvmAccount as Account,
  EvmServerAccount as ServerAccount,
  EvmSmartAccount as SmartAccount,
} from "../../accounts/evm/types.js";
import type { ListSpendPermissionsResult } from "../../actions/evm/listSpendPermissions.js";
import type {
  ListTokenBalancesOptions,
  ListTokenBalancesResult,
} from "../../actions/evm/listTokenBalances.js";
import type { RequestFaucetOptions, RequestFaucetResult } from "../../actions/evm/requestFaucet.js";
import type {
  TransactionResult,
  SendTransactionOptions,
} from "../../actions/evm/sendTransaction.js";
import type {
  PrepareAndSendUserOperationReturnType,
  SendUserOperationOptions,
  SendUserOperationReturnType,
} from "../../actions/evm/sendUserOperation.js";
import type { SmartAccountActions } from "../../actions/evm/types.js";
import type {
  EvmSwapsNetwork,
  EvmUserOperationNetwork,
  EvmUserOperationStatus,
  OpenApiEvmMethods,
  UpdateEvmAccountBody as UpdateEvmAccount,
  UpdateEvmSmartAccountBody as UpdateEvmSmartAccount,
  UserOperationReceipt,
} from "../../openapi-client/index.js";
import type { ListSpendPermissionsOptions } from "../../spend-permissions/types.js";
import type { Calls } from "../../types/calls.js";
import type { Address, EIP712Message, Hex } from "../../types/misc.js";
import type { WaitOptions } from "../../utils/wait.js";

/**
 * The EvmClient type, where all OpenApiEvmMethods methods are wrapped.
 */
export type EvmClientInterface = Omit<
  typeof OpenApiEvmMethods,
  | "createEvmAccount" // mapped to createAccount
  | "createEvmSmartAccount" // mapped to createSmartAccount
  | "createSpendPermission" // mapped to createSpendPermission
  | "listSpendPermissions" // mapped to listSpendPermissions
  | "revokeSpendPermission" // mapped to revokeSpendPermission
  | "importEvmAccount" // mapped to importAccount
  | "exportEvmAccount" // mapped to exportAccount
  | "exportEvmAccountByName" // mapped to exportAccount
  | "getEvmAccount" // mapped to getAccount
  | "getEvmAccountByName" // mapped to getAccount
  | "getEvmSmartAccount" // mapped to getSmartAccount
  | "getEvmSmartAccountByName" // mapped to getSmartAccount
  | "getEvmSwapPrice" // mapped to getSwapPrice
  | "createEvmSwapQuote" // mapped to createSwapQuote
  | "getUserOperation"
  | "updateEvmAccount" // mapped to updateAccount
  | "listEvmAccounts" // mapped to listAccounts
  | "listEvmSmartAccounts" // mapped to listSmartAccounts
  | "listEvmTokenBalances" // mapped to listTokenBalances
  | "prepareUserOperation"
  | "prepareAndSendUserOperation"
  | "requestEvmFaucet" // mapped to requestFaucet
  | "sendUserOperation"
  | "signEvmHash" // mapped to signHash
  | "signEvmMessage" // mapped to signMessage
  | "signEvmTransaction" // mapped to signTransaction
  | "signEvmTypedData" // mapped to signTypedData
  | "sendEvmTransaction" // mapped to sendTransaction
  | "signEvmTypedData" // mapped to signTypedData
  | "updateEvmAccount" // mapped to updateAccount
  | "exportEvmAccount"
  | "exportEvmAccountByName"
  | "updateEvmSmartAccount" // 🚧 Coming soon
> & {
  createAccount: (options: CreateServerAccountOptions) => Promise<ServerAccount>;
  createSmartAccount: (options: CreateSmartAccountOptions) => Promise<SmartAccount>;
  importAccount: (options: ImportServerAccountOptions) => Promise<ServerAccount>;
  exportAccount: (options: ExportServerAccountOptions) => Promise<string>;
  getAccount: (options: GetServerAccountOptions) => Promise<ServerAccount>;
  getSmartAccount: (options: GetSmartAccountOptions) => Promise<SmartAccount>;
  getSwapPrice: (
    options: GetSwapPriceOptions,
  ) => Promise<GetSwapPriceResult | SwapUnavailableResult>;
  createSwapQuote: (
    options: CreateSwapQuoteOptions,
  ) => Promise<CreateSwapQuoteResult | SwapUnavailableResult>;
  getOrCreateAccount: (options: GetOrCreateServerAccountOptions) => Promise<ServerAccount>;
  getUserOperation: (options: GetUserOperationOptions) => Promise<UserOperation>;
  updateAccount: (options: UpdateEvmAccountOptions) => Promise<ServerAccount>;
  updateSmartAccount: (options: UpdateEvmSmartAccountOptions) => Promise<SmartAccount>;
  listAccounts: (options: ListServerAccountsOptions) => Promise<ListServerAccountResult>;
  listSmartAccounts: (options: ListSmartAccountsOptions) => Promise<ListSmartAccountResult>;
  listSpendPermissions: (
    options: ListSpendPermissionsOptions,
  ) => Promise<ListSpendPermissionsResult>;
  listTokenBalances: (options: ListTokenBalancesOptions) => Promise<ListTokenBalancesResult>;
  prepareUserOperation: (options: PrepareUserOperationOptions) => Promise<UserOperation>;
  requestFaucet: (options: RequestFaucetOptions) => Promise<RequestFaucetResult>;
  sendTransaction: (options: SendTransactionOptions) => Promise<TransactionResult>;
  sendUserOperation: (
    options: SendUserOperationOptions<unknown[]>,
  ) => Promise<SendUserOperationReturnType>;
  prepareAndSendUserOperation: (
    options: PrepareAndSendUserOperationOptions,
  ) => Promise<PrepareAndSendUserOperationReturnType>;
  signHash: (options: SignHashOptions) => Promise<SignatureResult>;
  signMessage: (options: SignMessageOptions) => Promise<SignatureResult>;
  signTypedData: (options: SignTypedDataOptions) => Promise<SignatureResult>;
  signTransaction: (options: SignTransactionOptions) => Promise<SignatureResult>;
};

export type { ServerAccount, SmartAccount };

/**
 * Options for creating a swap quote between two tokens on an EVM network.
 */
export interface CreateSwapQuoteOptions {
  /** The network to create a swap quote on. */
  network: EvmSwapsNetwork;
  /** The token to receive (destination token). */
  toToken: Address;
  /** The token to send (source token). */
  fromToken: Address;
  /** The amount to send in atomic units of the token. */
  fromAmount: bigint;
  /** The address receiving the output of the swap. */
  taker: Address;
  /** The address signing the swap (only needed if taker is a smart contract, i.e. for smart account swaps). */
  signerAddress?: Address;
  /** The smart account object (required for smart account execution context only). */
  smartAccount?: SmartAccount;
  /** The price per unit of gas in wei. */
  gasPrice?: bigint;
  /** The slippage tolerance in basis points (0-10000). */
  slippageBps?: number;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for getting a swap price.
 */
export interface GetSwapPriceOptions {
  /** The network to get a price from. */
  network: EvmSwapsNetwork;
  /** The token to receive (destination token). */
  toToken: Address;
  /** The token to send (source token). */
  fromToken: Address;
  /** The amount to send in atomic units of the token. */
  fromAmount: bigint;
  /** The address that will perform the swap. */
  taker: Address;
  /** The signer address (only needed if taker is a smart contract). */
  signerAddress?: Address;
  /** The gas price in Wei. */
  gasPrice?: bigint;
  /** The slippage tolerance in basis points (0-10000). */
  slippageBps?: number;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Result of getting a swap price.
 */
export interface GetSwapPriceResult {
  /** Whether liquidity is available for the swap. */
  liquidityAvailable: true;
  /** The token to receive (destination token). */
  toToken: Address;
  /** The token to send (source token). */
  fromToken: Address;
  /** The amount to send in atomic units of the token. */
  fromAmount: bigint;
  /** The amount to receive in atomic units of the token. */
  toAmount: bigint;
  /** The minimum amount to receive after slippage in atomic units of the token. */
  minToAmount: bigint;
  /** The block number at which the liquidity conditions were examined. */
  blockNumber: bigint;
  /** The estimated fees for the swap. */
  fees: SwapFees;
  /** Potential issues discovered during validation. */
  issues: SwapIssues;
  /** The gas estimate for the swap. */
  gas?: bigint;
  /** The gas price in Wei. */
  gasPrice?: bigint;
}

/**
 * Result when liquidity is unavailable for a swap.
 */
export interface SwapUnavailableResult {
  /** Whether liquidity is available for the swap. */
  liquidityAvailable: false;
}

/**
 * Options for executing a swap quote.
 */
export interface ExecuteSwapQuoteOptions {
  /** Optional idempotency key for the request. */
  idempotencyKey?: string;
}

/**
 * Result of executing a swap quote.
 */
export interface ExecuteSwapQuoteResult {
  /** The transaction hash of the executed swap (for EOA swaps). */
  transactionHash?: Hex;
  /** The user operation hash of the executed swap (for smart account swaps). */
  userOpHash?: Hex;
  /** The address of the smart account (for smart account swaps). */
  smartAccountAddress?: Address;
  /** The status of the user operation (for smart accounts swaps). */
  status?: typeof EvmUserOperationStatus.broadcast;
}

/**
 * Result of creating a swap quote.
 */
export interface CreateSwapQuoteResult {
  /** Whether liquidity is available for the swap. */
  liquidityAvailable: true;
  /** The network for which this swap quote was created. */
  network: EvmSwapsNetwork;
  /** The token to receive (destination token). */
  toToken: Address;
  /** The token to send (source token). */
  fromToken: Address;
  /** The amount to send in atomic units of the token. */
  fromAmount: bigint;
  /** The amount to receive in atomic units of the token. */
  toAmount: bigint;
  /** The minimum amount to receive after slippage in atomic units of the token. */
  minToAmount: bigint;
  /** The block number at which the liquidity conditions were examined. */
  blockNumber: bigint;
  /** The estimated fees for the swap. */
  fees: SwapFees;
  /** Potential issues discovered during validation. */
  issues: SwapIssues;
  /** The transaction to execute the swap. */
  transaction?: {
    /** The contract address to send the transaction to. */
    to: Address;
    /** The transaction data. */
    data: Hex;
    /** The value to send with the transaction in Wei. */
    value: bigint;
    /** The gas limit for the transaction. */
    gas: bigint;
    /** The gas price for the transaction in Wei. */
    gasPrice: bigint;
  };
  /** Permit2 data if required for the swap. */
  permit2?: {
    /** EIP-712 typed data for signing. */
    eip712: EIP712Message;
  };
  /**
   * Execute the swap using the quote.
   *
   * @param {ExecuteSwapQuoteOptions} options - Options for executing the swap.
   * @returns {Promise<ExecuteSwapQuoteResult>} A promise that resolves to the swap execution result.
   */
  execute: (options?: ExecuteSwapQuoteOptions) => Promise<ExecuteSwapQuoteResult>;
}

/**
 * Options for getting a user operation.
 */
export interface GetUserOperationOptions {
  /** The smart account. */
  smartAccount: SmartAccount | ReadonlySmartAccount | Address;
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
  /** Optional data suffix (EIP-8021) to enable transaction attribution. */
  dataSuffix?: string;
}

/**
 * Options for preparing and sending a user operation.
 */
export interface PrepareAndSendUserOperationOptions {
  /** The smart account. */
  smartAccount: SmartAccount;
  /** The network. */
  network: EvmUserOperationNetwork;
  /** The calls. */
  calls: Calls<EvmCall[]>;
  /** The paymaster URL. */
  paymasterUrl?: string;
  /** An optional idempotency key. */
  idempotencyKey?: string;
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
  /** The override gas limit. */
  overrideGasLimit?: string;
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
  /**
   * The receipts associated with the broadcasted user operation.
   */
  receipts?: UserOperationReceipt[];
}

/**
 * Options for creating an EVM server account.
 */
export interface CreateServerAccountOptions {
  /** The name of the account. */
  name?: string;
  /** The policy ID to apply to the account. */
  accountPolicy?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for importing an EVM server account.
 */
export interface ImportServerAccountOptions {
  /** The public RSA key used to encrypt the private key when importing an EVM account. */
  encryptionPublicKey?: string;
  /** The name of the account. */
  name?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
  /** The private key of the account. */
  privateKey: Hex;
}

/**
 * Options for exporting an EVM server account.
 */
export interface ExportServerAccountOptions {
  /** The address of the account. */
  address?: Address;
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
  address?: Address;
  /** The owner of the account. */
  owner: Account;
  /** The name of the account. */
  name?: string;
}

/**
 * Options for getting an EVM account, or creating one if it doesn't exist.
 */
export interface GetOrCreateServerAccountOptions {
  /** The name of the account. */
  name: string;
}

/**
 * Options for getting an EVM account, or creating one if it doesn't exist.
 */
export interface GetOrCreateSmartAccountOptions {
  /** The name of the account. */
  name: string;
  /** The owner of the account. */
  owner: Account;
  /** The flag to enable spend permissions. */
  enableSpendPermissions?: boolean;
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
export interface ReadonlySmartAccount
  extends Omit<SmartAccount, "owners" | keyof SmartAccountActions | "useNetwork"> {
  /** The owners of the smart account. */
  owners: Address[];
}

/**
 * Options for creating an EVM server account.
 */
export interface UpdateEvmAccountOptions {
  /** The address of the account. */
  address: Address;
  /** The updates to apply to the account */
  update: UpdateEvmAccount;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for updating an EVM smart account.
 */
export interface UpdateEvmSmartAccountOptions {
  /** The address of the account. */
  address: Address;
  /** The updates to apply to the account */
  update: UpdateEvmSmartAccount;
  /** The idempotency key. */
  idempotencyKey?: string;
  /** The owner of the account. */
  owner: Account;
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
  /** The name of the account. */
  name?: string;
  /** The flag to enable spend permissions. */
  enableSpendPermissions?: boolean;
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
 * Options for signing an EVM typed data message.
 */
export interface SignTypedDataOptions {
  /** The address of the account. */
  address: Address;
  /** The domain of the message. */
  domain: EIP712Message["domain"];
  /** The types of the message. */
  types: EIP712Message["types"];
  /** The primary type of the message. This is the name of the struct in the `types` object that is the root of the message. */
  primaryType: EIP712Message["primaryType"];
  /** The message to sign. The structure of this message must match the `primaryType` struct in the `types` object. */
  message: EIP712Message["message"];
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
 * A fee in a specific token.
 */
export interface TokenFee {
  /** The amount of the fee in atomic units of the token. */
  amount: bigint;
  /** The contract address of the token that the fee is paid in. */
  token: Address;
}

/**
 * The estimated fees for a swap.
 */
export interface SwapFees {
  /** The estimated gas fee for the swap. */
  gasFee?: TokenFee;
  /** The estimated protocol fee for the swap. */
  protocolFee?: TokenFee;
}

/**
 * Details of allowance issues for a swap.
 */
export interface SwapAllowanceIssue {
  /** The current allowance of the fromToken by the taker. */
  currentAllowance: bigint;
  /** The address to set the allowance on. */
  spender: Address;
}

/**
 * Details of balance issues for a swap.
 */
export interface SwapBalanceIssue {
  /** The contract address of the token. */
  token: Address;
  /** The current balance of the fromToken by the taker. */
  currentBalance: bigint;
  /** The amount of the token that the taker must hold. */
  requiredBalance: bigint;
}

/**
 * Potential issues discovered during swap validation.
 */
export interface SwapIssues {
  /** Details of the allowances that the taker must set. Null if no allowance is required. */
  allowance?: SwapAllowanceIssue;
  /** Details of the balance of the fromToken that the taker must hold. Null if sufficient balance. */
  balance?: SwapBalanceIssue;
  /** True when the transaction cannot be validated (e.g., insufficient balance). */
  simulationIncomplete: boolean;
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

/**
 * Legacy type aliases for backwards compatibility.
 *
 * @deprecated Use the new type names instead.
 */
export type CreateSwapOptions = CreateSwapQuoteOptions;
export type CreateSwapResult = CreateSwapQuoteResult;
export type GetSwapQuoteOptions = GetSwapPriceOptions;
export type GetSwapQuoteResult = GetSwapPriceResult;
export type SwapQuoteUnavailableResult = SwapUnavailableResult;
export type SwapPriceUnavailableResult = SwapUnavailableResult;

/**
 * Options for signing and wrapping EIP-712 typed data with a smart account.
 * This method handles the full smart account signature flow including replay-safe hashing.
 */
export interface SmartAccountSignAndWrapTypedDataOptions {
  /** The chain ID for the signature (used for replay protection). */
  chainId: bigint;
  /** The EIP-712 typed data message to sign. */
  typedData: EIP712Message;
  /** The index of the owner to sign with (defaults to 0). */
  ownerIndex?: bigint;
  /** Optional idempotency key for the signing request. */
  idempotencyKey?: string;
}
