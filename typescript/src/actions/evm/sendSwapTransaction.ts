import { concat, numberToHex, size } from "viem";

import { createSwap } from "./createSwap.js";
import { sendTransaction } from "./sendTransaction.js";

import type {
  CreateSwapResult,
  CreateSwapOptions,
  SwapUnavailableResult,
} from "../../client/evm/evm.types.js";
import type {
  CdpOpenApiClientType,
  SendEvmTransactionBodyNetwork,
} from "../../openapi-client/index.js";
import type { Address, Hex } from "../../types/misc.js";
import type { TransactionRequestEIP1559 } from "viem";

/**
 * Base options for sending a swap transaction.
 */
interface BaseSendSwapTransactionOptions {
  /**
   * The address of the account that will execute the swap.
   */
  address: Address;

  /**
   * The network to execute the swap on (e.g., "ethereum", "base").
   */
  network: SendEvmTransactionBodyNetwork;

  /**
   * Optional idempotency key for the request.
   */
  idempotencyKey?: string;
}

/**
 * Options when providing an already created swap.
 */
interface SendSwapTransactionWithSwapResult extends BaseSendSwapTransactionOptions {
  /**
   * The swap transaction data returned by the createSwap method.
   */
  swap: CreateSwapResult;
}

/**
 * Options when creating a swap inline.
 */
interface SendSwapTransactionWithSwapOptions extends BaseSendSwapTransactionOptions {
  /** The token to buy (destination token). */
  buyToken: Address;
  /** The token to sell (source token). */
  sellToken: Address;
  /** The amount to sell in atomic units of the token. */
  sellAmount: bigint;
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
 * Either provide a pre-created swap result or inline swap parameters.
 */
export type SendSwapTransactionOptions =
  | SendSwapTransactionWithSwapResult
  | SendSwapTransactionWithSwapOptions;

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
 * Sends a swap transaction to the blockchain.
 * Handles any permit2 signatures required for the swap.
 *
 * @param {CdpOpenApiClientType} client - The client to use for sending the swap.
 * @param {SendSwapTransactionOptions} options - The options for the swap submission.
 *
 * @returns {Promise<SendSwapTransactionResult>} A promise that resolves to the transaction hash.
 *
 * @throws {Error} If liquidity is not available when using swapOptions.
 *
 * @example **Sending a swap with pre-created swap result**
 * ```ts
 * // First create a swap
 * const swap = await cdp.evm.createSwap({
 *   network: "base",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: account.address
 * });
 *
 * // Check if liquidity is available
 * if (!swap.liquidityAvailable) {
 *   console.error("Insufficient liquidity for swap");
 *   return;
 * }
 *
 * // Send the swap
 * const result = await sendSwapTransaction(client, {
 *   address: account.address,
 *   network: "base",
 *   swap
 * });
 *
 * console.log(`Swap sent with transaction hash: ${result.transactionHash}`);
 * ```
 *
 * @example **Sending a swap with inline options (all-in-one)**
 * ```ts
 * // Send swap in one call
 * const result = await sendSwapTransaction(client, {
 *   address: account.address,
 *   network: "base",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: account.address
 * });
 *
 * console.log(`Swap sent with transaction hash: ${result.transactionHash}`);
 * ```
 */
export async function sendSwapTransaction(
  client: CdpOpenApiClientType,
  options: SendSwapTransactionOptions,
): Promise<SendSwapTransactionResult> {
  const { address, network, idempotencyKey } = options;

  let swapResult: CreateSwapResult | SwapUnavailableResult;

  // Determine if we need to create the swap or use the provided one
  if ("swap" in options) {
    // Use the provided swap
    swapResult = options.swap;
  } else {
    // Create the swap using the provided options (SendSwapTransactionWithSwapOptions)
    swapResult = await createSwap(client, {
      network: options.network as CreateSwapOptions["network"],
      buyToken: options.buyToken,
      sellToken: options.sellToken,
      sellAmount: options.sellAmount,
      taker: options.taker,
      signerAddress: options.signerAddress,
      gasPrice: options.gasPrice,
      slippageBps: options.slippageBps,
    });
  }

  // Check if liquidity is available
  if (!swapResult.liquidityAvailable) {
    throw new Error("Insufficient liquidity for swap");
  }

  // At this point, we know that swapResult is CreateSwapResult
  const swap = swapResult as CreateSwapResult;

  // Check for allowance issues
  if (swap.issues?.allowance) {
    const { currentAllowance, spender } = swap.issues.allowance;
    throw new Error(
      `Insufficient token allowance. Current allowance: ${currentAllowance}. ` +
        `Please approve the Permit2 contract (${spender}) to spend your tokens.`,
    );
  }

  // If the transaction doesn't exist, throw an error
  if (!swap.transaction) {
    throw new Error("No transaction data found in the swap");
  }

  // Get the transaction data and modify it if needed for Permit2
  let txData = swap.transaction.data as Hex;

  if (swap.permit2?.eip712) {
    // Sign the Permit2 EIP-712 message
    const signature = await client.signEvmTypedData(
      address,
      {
        domain: swap.permit2.eip712.domain,
        types: swap.permit2.eip712.types,
        primaryType: swap.permit2.eip712.primaryType,
        message: swap.permit2.eip712.message,
      },
      idempotencyKey,
    );

    // Calculate the signature length as a 32-byte hex value
    const signatureLengthInHex = numberToHex(size(signature.signature as Hex), {
      signed: false,
      size: 32,
    });

    // Append the signature length and signature to the transaction data
    txData = concat([txData, signatureLengthInHex, signature.signature as Hex]);
  }

  // Create a transaction object
  const transaction: TransactionRequestEIP1559 = {
    to: swap.transaction.to as `0x${string}`,
    data: txData,
    // Only include these properties if they exist
    ...(swap.transaction.value ? { value: BigInt(swap.transaction.value) } : {}),
    ...(swap.transaction.gas ? { gas: BigInt(swap.transaction.gas) } : {}),
  };

  // Use sendTransaction instead of directly calling client.sendEvmTransaction
  const result = await sendTransaction(client, {
    address,
    network,
    transaction,
    idempotencyKey,
  });

  return {
    transactionHash: result.transactionHash,
  };
}
