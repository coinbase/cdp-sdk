import type { EvmSmartAccount } from "../../../accounts/evm/types.js";
import type {
  CreateSwapQuoteOptions,
  CreateSwapQuoteResult,
  SwapUnavailableResult,
} from "../../../client/evm/evm.types.js";
import type {
  SendEvmTransactionBodyNetwork,
  EvmUserOperationNetwork,
  EvmUserOperationStatus,
  EvmSwapsNetwork,
} from "../../../openapi-client/index.js";
import type { Address, Hex } from "../../../types/misc.js";

// Type representing networks that support both user operations and swaps.
export type SmartAccountSwapNetwork = Extract<EvmSwapsNetwork, EvmUserOperationNetwork>;

/**
 * Base options for sending a swap transaction.
 */
interface BaseSendSwapTransactionOptions {
  /**
   * The address of the account that will execute the swap.
   */
  address: Address;

  /**
   * Optional idempotency key for the request.
   */
  idempotencyKey?: string;
}

/**
 * Options when providing an already created swap quote.
 */
interface QuoteBasedSendSwapTransactionOptions extends BaseSendSwapTransactionOptions {
  /**
   * The swap quote returned by the createSwapQuote method.
   */
  swapQuote: CreateSwapQuoteResult;
}

/**
 * Options when creating a swap quote inline.
 */
interface InlineSendSwapTransactionOptions extends BaseSendSwapTransactionOptions {
  /**
   * The network to execute the swap on (e.g., "ethereum", "base").
   */
  network: SendEvmTransactionBodyNetwork;
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
}

/**
 * Options for sending a swap transaction.
 * Either provide a pre-created swap quote result or inline swap parameters.
 */
export type SendSwapTransactionOptions =
  | QuoteBasedSendSwapTransactionOptions
  | InlineSendSwapTransactionOptions;

/**
 * Result of sending a swap transaction.
 */
export interface SendSwapTransactionResult {
  /**
   * The transaction hash of the submitted swap.
   */
  transactionHash: Hex;
}

/**
 * Options for creating a swap quote (account-level).
 */
export type AccountQuoteSwapOptions = Omit<CreateSwapQuoteOptions, "taker">;

/**
 * Result of creating a swap quote (account-level).
 */
export type AccountQuoteSwapResult = CreateSwapQuoteResult | SwapUnavailableResult;

/**
 * Options when providing an already created swap quote (account-level).
 */
interface AccountQuoteBasedSwapOptions {
  /**
   * The swap quote returned by the createSwapQuote method.
   */
  swapQuote: CreateSwapQuoteResult;

  /**
   * Optional idempotency key for the request.
   */
  idempotencyKey?: string;
}

/**
 * Options when creating a swap quote inline (account-level).
 */
interface AccountInlineSwapOptions {
  /**
   * The network to execute the swap on (e.g., "ethereum", "base").
   */
  network: SendEvmTransactionBodyNetwork;
  /** The token to receive (destination token). */
  toToken: Address;
  /** The token to send (source token). */
  fromToken: Address;
  /** The amount to send in atomic units of the token. */
  fromAmount: bigint;
  /** The signer address (only needed if taker is a smart contract). */
  signerAddress?: Address;
  /** The gas price in Wei. */
  gasPrice?: bigint;
  /** The slippage tolerance in basis points (0-10000). */
  slippageBps?: number;

  /**
   * Optional idempotency key for the request.
   */
  idempotencyKey?: string;
}

/**
 * Options for executing a token swap (account-level).
 * The taker is automatically set to the account's address.
 */
export type AccountSwapOptions = AccountQuoteBasedSwapOptions | AccountInlineSwapOptions;

/**
 * Result of executing a token swap (account-level).
 */
export type AccountSwapResult = SendSwapTransactionResult;

/**
 * Options for creating a swap quote (smart account-level).
 */
export type SmartAccountQuoteSwapOptions = Omit<CreateSwapQuoteOptions, "taker" | "network"> & {
  /** The network to create a swap quote on. Smart accounts only support networks that support both user operations and swaps. */
  network: SmartAccountSwapNetwork;
};

/**
 * Result of creating a swap quote (smart account-level).
 */
export type SmartAccountQuoteSwapResult = CreateSwapQuoteResult | SwapUnavailableResult;

/**
 * Options when providing an already created swap quote (smart account-level).
 */
interface SmartAccountQuoteBasedSwapOptions {
  /**
   * The swap quote returned by the createSwapQuote method.
   */
  swapQuote: CreateSwapQuoteResult;

  /**
   * Optional URL of the paymaster service to use for gas sponsorship.
   */
  paymasterUrl?: string;

  /**
   * Optional idempotency key for the request.
   */
  idempotencyKey?: string;
}

/**
 * Options when creating a swap quote inline (smart account-level).
 */
interface SmartAccountInlineSwapOptions {
  /**
   * The network to execute the swap on (e.g., "base").
   * Smart accounts only support networks that support both user operations and swaps.
   */
  network: SmartAccountSwapNetwork;
  /** The token to receive (destination token). */
  toToken: Address;
  /** The token to send (source token). */
  fromToken: Address;
  /** The amount to send in atomic units of the token. */
  fromAmount: bigint;
  /** The signer address (only needed if taker is a smart contract). */
  signerAddress?: Address;
  /** The gas price in Wei. */
  gasPrice?: bigint;
  /** The slippage tolerance in basis points (0-10000). */
  slippageBps?: number;

  /**
   * Optional URL of the paymaster service to use for gas sponsorship.
   */
  paymasterUrl?: string;

  /**
   * Optional idempotency key for the request.
   */
  idempotencyKey?: string;
}

/**
 * Options for executing a token swap (smart account-level).
 * The taker is automatically set to the smart account's address.
 */
export type SmartAccountSwapOptions =
  | SmartAccountQuoteBasedSwapOptions
  | SmartAccountInlineSwapOptions;

/**
 * Result of executing a token swap (smart account-level).
 */
export type SmartAccountSwapResult = {
  /** The address of the smart wallet. */
  smartAccountAddress: Address;
  /** The status of the user operation. */
  status: string;
  /** The hash of the user operation. */
  userOpHash: Hex;
};

/**
 * Base options for sending a swap operation via smart account.
 */
interface BaseSendSwapOperationOptions {
  /** The smart account that will execute the swap. */
  smartAccount: EvmSmartAccount;
  /** Optional URL of the paymaster service to use for gas sponsorship. */
  paymasterUrl?: string;
  /** Optional idempotency key for the request. */
  idempotencyKey?: string;
}

/**
 * Options when providing an already created swap quote (for sendSwapOperation).
 */
interface QuoteBasedSendSwapOperationOptions extends BaseSendSwapOperationOptions {
  /** The swap quote returned by the createSwapQuote method. */
  swapQuote: CreateSwapQuoteResult;
}

/**
 * Options when creating a swap quote inline (for sendSwapOperation).
 */
interface InlineSendSwapOperationOptions extends BaseSendSwapOperationOptions {
  /** The network to execute the swap on. */
  network: EvmUserOperationNetwork;
  /** The token to receive (destination token). */
  toToken: Address;
  /** The token to send (source token). */
  fromToken: Address;
  /** The amount to send in atomic units of the token. */
  fromAmount: bigint;
  /** The address that will perform the swap. */
  taker: Address;
  /** The signer address (required since taker is a smart contract). */
  signerAddress: Address;
  /** The gas price in Wei. */
  gasPrice?: bigint;
  /** The slippage tolerance in basis points (0-10000). */
  slippageBps?: number;
}

/**
 * Options for sending a swap operation via smart account.
 * Either provide a pre-created swap quote result or inline swap parameters.
 */
export type SendSwapOperationOptions =
  | QuoteBasedSendSwapOperationOptions
  | InlineSendSwapOperationOptions;

/**
 * Result of sending a swap operation via smart account.
 */
export type SendSwapOperationResult = {
  /** The address of the smart wallet. */
  smartAccountAddress: Address;
  /** The status of the user operation. */
  status: typeof EvmUserOperationStatus.broadcast;
  /** The hash of the user operation. */
  userOpHash: Hex;
};
