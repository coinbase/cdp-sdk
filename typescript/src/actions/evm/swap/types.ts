import type {
  CreateSwapQuoteOptions,
  CreateSwapQuoteResult,
  SwapUnavailableResult,
} from "../../../client/evm/evm.types.js";
import type { SendEvmTransactionBodyNetwork } from "../../../openapi-client/index.js";
import type { Address, Hex } from "../../../types/misc.js";

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
export type QuoteSwapOptions = Omit<CreateSwapQuoteOptions, "taker">;

/**
 * Result of creating a swap quote (account-level).
 */
export type QuoteSwapResult = CreateSwapQuoteResult | SwapUnavailableResult;

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
export type SwapOptions = AccountQuoteBasedSwapOptions | AccountInlineSwapOptions;

/**
 * Result of executing a token swap (account-level).
 */
export type SwapResult = SendSwapTransactionResult;
