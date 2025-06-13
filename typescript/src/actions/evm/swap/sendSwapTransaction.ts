import { concat, numberToHex, size } from "viem";

import { createSwapQuote } from "./createSwapQuote.js";
import { createDeterministicUuidV4 } from "../../../utils/uuidV4.js";
import { sendTransaction } from "../sendTransaction.js";

import type { SendSwapTransactionOptions, SendSwapTransactionResult } from "./types.js";
import type {
  CreateSwapQuoteResult,
  CreateSwapQuoteOptions,
  SwapUnavailableResult,
} from "../../../client/evm/evm.types.js";
import type {
  CdpOpenApiClientType,
  SendEvmTransactionBodyNetwork,
} from "../../../openapi-client/index.js";
import type { Hex } from "../../../types/misc.js";
import type { TransactionRequestEIP1559 } from "viem";

/**
 * Sends a swap transaction to the blockchain.
 * Handles any permit2 signatures required for the swap.
 *
 * If you encounter token allowance issues, you'll need to perform a token approval transaction first to allow
 * the Permit2 contract to spend the appropriate amount of your fromToken.
 * See `examples/typescript/evm/account.sendSwapTransaction.ts` for example code on handling token approvals.
 *
 * @param {CdpOpenApiClientType} client - The client to use for sending the swap.
 * @param {SendSwapTransactionOptions} options - The options for the swap submission.
 *
 * @returns {Promise<SendSwapTransactionResult>} A promise that resolves to the transaction hash.
 *
 * @throws {Error} If liquidity is not available for the swap.
 * @throws {Error} If there are insufficient token allowances. In this case, you need to approve the
 *                 Permit2 contract to spend your tokens before attempting the swap. The error message
 *                 will include the current allowance and the spender address that needs approval.
 * @throws {Error} If no transaction data is found in the swap result.
 *
 * @example **Sending a swap with pre-created swap quote object**
 * ```ts
 * // First create a swap quote
 * const swapQuote = await cdp.evm.createSwapQuote({
 *   network: "base",
 *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: account.address
 * });
 *
 * // Check if liquidity is available
 * if (!swapQuote.liquidityAvailable) {
 *   console.error("Insufficient liquidity for swap");
 *   return;
 * }
 *
 * // Send the swap
 * const result = await sendSwapTransaction(client, {
 *   address: account.address,
 *   swapQuote: swapQuote
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
 *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
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
  const { address, idempotencyKey } = options;

  let swapResult: CreateSwapQuoteResult | SwapUnavailableResult;

  // Determine if we need to create the swap quote or use the provided one
  if ("swapQuote" in options) {
    // Use the provided swap quote
    swapResult = options.swapQuote;
  } else {
    // Create the swap quote using the provided options (InlineSendSwapTransactionOptions)
    /**
     * Deterministically derive a new idempotency key from the provided idempotency key for swap quote creation to avoid key reuse.
     */
    const swapQuoteIdempotencyKey = idempotencyKey
      ? createDeterministicUuidV4(idempotencyKey, "createSwapQuote")
      : undefined;

    swapResult = await createSwapQuote(client, {
      network: options.network as CreateSwapQuoteOptions["network"],
      toToken: options.toToken,
      fromToken: options.fromToken,
      fromAmount: options.fromAmount,
      taker: options.taker,
      signerAddress: options.signerAddress,
      gasPrice: options.gasPrice,
      slippageBps: options.slippageBps,
      idempotencyKey: swapQuoteIdempotencyKey,
    });
  }

  // Check if liquidity is available
  if (!swapResult.liquidityAvailable) {
    throw new Error("Insufficient liquidity for swap");
  }

  // At this point, we know that swapResult is CreateSwapQuoteResult
  const swap = swapResult as CreateSwapQuoteResult;

  // Check for allowance issues
  if (swap.issues?.allowance) {
    const { currentAllowance, spender } = swap.issues.allowance;
    throw new Error(
      `Insufficient token allowance for swap. Current allowance: ${currentAllowance}. ` +
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
    /**
     * Sign the Permit2 EIP-712 message.
     * Deterministically derive a new idempotency key from the provided idempotency key for permit2 signing to avoid key reuse.
     */
    const permit2IdempotencyKey = idempotencyKey
      ? createDeterministicUuidV4(idempotencyKey, "permit2")
      : undefined;

    const signature = await client.signEvmTypedData(
      address,
      {
        domain: swap.permit2.eip712.domain,
        types: swap.permit2.eip712.types,
        primaryType: swap.permit2.eip712.primaryType,
        message: swap.permit2.eip712.message,
      },
      permit2IdempotencyKey,
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
    network: swap.network as SendEvmTransactionBodyNetwork,
    transaction,
    idempotencyKey,
  });

  return {
    transactionHash: result.transactionHash,
  };
}
