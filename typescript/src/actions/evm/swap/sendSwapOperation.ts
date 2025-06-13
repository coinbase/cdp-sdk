import { concat, numberToHex, size } from "viem";

import { createSwapQuote } from "./createSwapQuote.js";
import { createDeterministicUuidV4 } from "../../../utils/uuidV4.js";
import { sendUserOperation } from "../sendUserOperation.js";
import { signAndWrapTypedDataForSmartAccount } from "../signAndWrapTypedDataForSmartAccount.js";

import type { SendSwapOperationOptions, SendSwapOperationResult } from "./types.js";
import type { EvmSmartAccount } from "../../../accounts/evm/types.js";
import type {
  CreateSwapQuoteResult,
  CreateSwapQuoteOptions,
  SwapUnavailableResult,
} from "../../../client/evm/evm.types.js";
import type {
  CdpOpenApiClientType,
  EvmUserOperationNetwork,
} from "../../../openapi-client/index.js";
import type { Hex } from "../../../types/misc.js";

/**
 * Sends a swap operation to the blockchain via a smart account user operation.
 * Handles any permit2 signatures required for the swap.
 *
 * If you encounter token allowance issues, you'll need to perform a token approval transaction first to allow
 * the Permit2 contract to spend the appropriate amount of your fromToken.
 * See examples for code on handling token approvals.
 *
 * @param {CdpOpenApiClientType} client - The client to use for sending the swap operation.
 * @param {SendSwapOperationOptions} options - The options for the swap submission.
 *
 * @returns {Promise<SendSwapOperationResult>} A promise that resolves to the user operation result.
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
 *   taker: smartAccount.address
 * });
 *
 * // Check if liquidity is available
 * if (!swapQuote.liquidityAvailable) {
 *   console.error("Insufficient liquidity for swap");
 *   return;
 * }
 *
 * // Send the swap operation
 * const result = await sendSwapOperation(client, {
 *   smartAccount: smartAccount,
 *   swapQuote: swapQuote
 * });
 *
 * console.log(`Swap operation sent with user op hash: ${result.userOpHash}`);
 * ```
 *
 * @example **Sending a swap with inline options (all-in-one)**
 * ```ts
 * // Send swap operation in one call
 * const result = await sendSwapOperation(client, {
 *   smartAccount: smartAccount,
 *   network: "base",
 *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: smartAccount.address
 * });
 *
 * console.log(`Swap operation sent with user op hash: ${result.userOpHash}`);
 * ```
 */
export async function sendSwapOperation(
  client: CdpOpenApiClientType,
  options: SendSwapOperationOptions,
): Promise<SendSwapOperationResult> {
  const { smartAccount, paymasterUrl, idempotencyKey } = options;

  let swapResult: CreateSwapQuoteResult | SwapUnavailableResult;

  // Determine if we need to create the swap quote or use the provided one
  if ("swapQuote" in options) {
    // Use the provided swap quote
    swapResult = options.swapQuote;
  } else {
    // Create the swap quote using the provided options (inline options)
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
    // Create the permit2 idempotency key
    const permit2IdempotencyKey = idempotencyKey
      ? createDeterministicUuidV4(idempotencyKey, "permit2")
      : undefined;

    // Sign and wrap the permit2 typed data according to the Coinbase Smart Wallet contract requirements for EIP-712 signatures
    const { signature: wrappedSignature } = await signAndWrapTypedDataForSmartAccount(client, {
      smartAccount,
      chainId: BigInt(swap.permit2.eip712.domain.chainId || 1),
      typedData: swap.permit2.eip712,
      ownerIndex: 0n,
      idempotencyKey: permit2IdempotencyKey,
    });

    // Calculate the Permit2 signature length as a 32-byte hex value
    const permit2SignatureLengthInHex = numberToHex(size(wrappedSignature), {
      signed: false,
      size: 32,
    });

    // Append the Permit2 signature length and signature to the transaction data
    txData = concat([txData, permit2SignatureLengthInHex, wrappedSignature]);
  }

  // Send the swap as a user operation
  const result = await sendUserOperation(client, {
    smartAccount: smartAccount as EvmSmartAccount,
    network: swap.network as EvmUserOperationNetwork,
    paymasterUrl,
    idempotencyKey,
    calls: [
      {
        to: swap.transaction.to,
        data: txData,
        // Only include value if it exists
        ...(swap.transaction.value ? { value: BigInt(swap.transaction.value) } : {}),
      },
    ],
  });

  return result;
}
