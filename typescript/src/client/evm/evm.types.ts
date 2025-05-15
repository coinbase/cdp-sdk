import type {
  EvmAccount as Account,
  EvmServerAccount as ServerAccount,
  EvmSmartAccount as SmartAccount,
} from "../../accounts/evm/types.js";
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
  SendUserOperationOptions,
  SendUserOperationReturnType,
} from "../../actions/evm/sendUserOperation.js";
import type { SmartAccountActions } from "../../actions/evm/types.js";
import type {
  EvmSwapsNetwork,
  EvmUserOperationNetwork,
  EvmUserOperationStatus,
  OpenApiEvmMethods,
  UpdateEvmAccountBody,
} from "../../openapi-client/index.js";
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
  | "getEvmAccount" // mapped to getAccount
  | "getEvmAccountByName" // mapped to getAccount
  | "getEvmSmartAccount" // mapped to getSmartAccount
  | "getEvmSwapQuote" // mapped to getSwapQuote
  | "createEvmSwap" // mapped to createSwap
  | "getUserOperation"
  | "updateEvmAccount" // mapped to updateAccount
  | "listEvmAccounts" // mapped to listAccounts
  | "listEvmSmartAccounts" // mapped to listSmartAccounts
  | "listEvmTokenBalances" // mapped to listTokenBalances
  | "prepareUserOperation"
  | "requestEvmFaucet" // mapped to requestFaucet
  | "sendUserOperation"
  | "signEvmHash" // mapped to signHash
  | "signEvmMessage" // mapped to signMessage
  | "signEvmTransaction" // mapped to signTransaction
  | "signEvmTypedData" // mapped to signTypedData
  | "sendEvmTransaction" // mapped to sendTransaction
  | "signEvmTypedData" // mapped to signTypedData
  | "updateEvmAccount" // mapped to updateAccount
> & {
  createAccount: (options: CreateServerAccountOptions) => Promise<ServerAccount>;
  createSmartAccount: (options: CreateSmartAccountOptions) => Promise<SmartAccount>;
  getAccount: (options: GetServerAccountOptions) => Promise<ServerAccount>;
  getSmartAccount: (options: GetSmartAccountOptions) => Promise<SmartAccount>;
  getSwapQuote: (options: GetSwapQuoteOptions) => Promise<SwapQuote>;
  createSwap: (options: CreateSwapOptions) => Promise<Swap>;
  getOrCreateAccount: (options: GetOrCreateServerAccountOptions) => Promise<ServerAccount>;
  getUserOperation: (options: GetUserOperationOptions) => Promise<UserOperation>;
  updateAccount: (options: UpdateEvmAccountOptions) => Promise<ServerAccount>;
  listAccounts: (options: ListServerAccountsOptions) => Promise<ListServerAccountResult>;
  listSmartAccounts: (options: ListSmartAccountsOptions) => Promise<ListSmartAccountResult>;
  listTokenBalances: (options: ListTokenBalancesOptions) => Promise<ListTokenBalancesResult>;
  prepareUserOperation: (options: PrepareUserOperationOptions) => Promise<UserOperation>;
  requestFaucet: (options: RequestFaucetOptions) => Promise<RequestFaucetResult>;
  sendTransaction: (options: SendTransactionOptions) => Promise<TransactionResult>;
  sendUserOperation: (
    options: SendUserOperationOptions<unknown[]>,
  ) => Promise<SendUserOperationReturnType>;
  signHash: (options: SignHashOptions) => Promise<SignatureResult>;
  signMessage: (options: SignMessageOptions) => Promise<SignatureResult>;
  signTypedData: (options: SignTypedDataOptions) => Promise<SignatureResult>;
  signTransaction: (options: SignTransactionOptions) => Promise<SignatureResult>;
};

export type { ServerAccount, SmartAccount };

/**
 * Fee structure for token-based fees.
 */
export interface SwapFee {
  /** The fee amount. */
  amount: string;
  /** The token used for the fee. */
  token: Address;
}

/**
 * Options for creating a swap between two tokens on an EVM network.
 */
export interface CreateSwapOptions {
  /** The network to create a swap on. */
  network: EvmSwapsNetwork;
  /** The token to buy (destination token). */
  buyToken: Address;
  /** The token to sell (source token). */
  sellToken: Address;
  /** The amount to sell in atomic units of the token. */
  sellAmount: string;
  /** The address that will perform the swap. */
  taker: Address;
  /** The signer address (only needed if taker is a smart contract). */
  signerAddress?: Address;
  /** The gas price in Wei. */
  gasPrice?: string;
  /** The slippage tolerance in basis points (0-10000). */
  slippageBps?: number;
}

/**
 * Transaction details for executing a swap.
 */
export interface SwapTransaction {
  /** The address of the contract to call. */
  to: Address;
  /** The hex-encoded call data to send to the contract. */
  data: Hex;
  /** The estimated gas limit for the transaction. */
  gas: string;
  /** The gas price to use for the transaction. */
  gasPrice: string;
  /** The value of the transaction in Wei. */
  value: string;
}

/**
 * Permit2 authorization details for a swap.
 */
export interface SwapPermit2 {
  /** The hash for the approval according to EIP-712. */
  hash: Hex;
  /** The EIP-712 typed data to sign. */
  eip712: EIP712Message;
}

/**
 * Result of a successful swap creation.
 */
export interface Swap {
  /** The block number when this swap was generated. */
  blockNumber: string;
  /** The amount of the buy token that will be received in atomic units. */
  buyAmount: string;
  /** The buy token address. */
  buyToken: Address;
  /** The fees associated with the swap. */
  fees: {
    /** The gas fee for the swap. */
    gasFee: SwapFee | null;
    /** The protocol fee for the swap. */
    protocolFee: SwapFee | null;
  };
  /** Issues that might prevent the swap from executing successfully. */
  issues: {
    /** Allowance issues. */
    allowance: {
      /** Current allowance. */
      currentAllowance: string;
      /** Spender address that needs approval. */
      spender: Address;
    } | null;
    /** Balance issues. */
    balance: {
      /** Token with insufficient balance. */
      token: Address;
      /** Current balance. */
      currentBalance: string;
      /** Required balance. */
      requiredBalance: string;
    } | null;
    /** Whether simulation was incomplete. */
    simulationIncomplete: boolean;
  };
  /** Whether there's enough liquidity to execute the swap. */
  liquidityAvailable: boolean;
  /** The minimum amount of buy token to receive considering slippage. */
  minBuyAmount: string;
  /** The amount of sell token to sell. */
  sellAmount: string;
  /** The sell token address. */
  sellToken: Address;
  /** The permit2 authorization details, null for native token swaps. */
  permit2: SwapPermit2 | null;
  /** The transaction details to execute the swap. */
  transaction: SwapTransaction;
}

/**
 * Options for getting a swap quote.
 */
export interface GetSwapQuoteOptions {
  /** The network to get a quote from. */
  network: EvmSwapsNetwork;
  /** The token to buy (destination token). */
  buyToken: Address;
  /** The token to sell (source token). */
  sellToken: Address;
  /** The amount to sell in atomic units of the token. */
  sellAmount: string;
  /** The address that will perform the swap. */
  taker: Address;
  /** The signer address (only needed if taker is a smart contract). */
  signerAddress?: Address;
  /** The gas price in Wei. */
  gasPrice?: string;
  /** The slippage tolerance in basis points (0-10000). */
  slippageBps?: number;
}

/**
 * Result of a successful swap quote.
 */
export interface SwapQuote {
  /** The block number when this quote was generated. */
  blockNumber: string;
  /** The amount of the buy token that will be received in atomic units. */
  buyAmount: string;
  /** The buy token address. */
  buyToken: Address;
  /** The fees associated with the swap. */
  fees: {
    /** The gas fee for the swap. */
    gasFee: SwapFee | null;
    /** The protocol fee for the swap. */
    protocolFee: SwapFee | null;
  };
  /** Issues that might prevent the swap from executing successfully. */
  issues: {
    /** Allowance issues. */
    allowance: {
      /** Current allowance. */
      currentAllowance: string;
      /** Spender address that needs approval. */
      spender: Address;
    } | null;
    /** Balance issues. */
    balance: {
      /** Token with insufficient balance. */
      token: Address;
      /** Current balance. */
      currentBalance: string;
      /** Required balance. */
      requiredBalance: string;
    } | null;
    /** Whether simulation was incomplete. */
    simulationIncomplete: boolean;
  };
  /** Whether there's enough liquidity to execute the swap. */
  liquidityAvailable: boolean;
  /** The minimum amount of buy token to receive considering slippage. */
  minBuyAmount: string;
  /** The amount of sell token to sell. */
  sellAmount: string;
  /** The sell token address. */
  sellToken: Address;
  /** The estimated gas limit for the transaction. */
  gas: string | null;
  /** The gas price that should be used for the transaction. */
  gasPrice: string;
}

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
 * Options for getting an EVM account, or creating one if it doesn't exist.
 */
export interface GetOrCreateServerAccountOptions {
  /** The name of the account. */
  name: string;
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
  extends Omit<SmartAccount, "owners" | keyof SmartAccountActions> {
  /** The owners of the smart account. */
  owners: Address[];
}

/**
 * Options for creating an EVM server account.
 */
export interface UpdateEvmAccountOptions {
  /** The address of the account. */
  address: string;
  /** The updates to apply to the account */
  update: UpdateEvmAccountBody;
  /** The idempotency key. */
  idempotencyKey?: string;
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
 * Options for signing an EVM message.
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
