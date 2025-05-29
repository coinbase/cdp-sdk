import { concat, numberToHex, size } from "viem";

import { sendUserOperation } from "./sendUserOperation.js";

import type { EvmSmartAccount } from "../../accounts/evm/types.js";
import type {
  CdpOpenApiClientType,
  CreateSwapResponse,
  SendEvmTransactionBodyNetwork,
} from "../../openapi-client/index.js";
import type { Hex } from "../../types/misc.js";

/**
 * Options for submitting a swap via a user operation.
 */
export interface SubmitSwapOperationOptions {
  /**
   * The smart account that will execute the swap.
   */
  smartAccount: EvmSmartAccount;

  /**
   * The network to execute the swap on (e.g., "base", "base-sepolia").
   */
  network: SendEvmTransactionBodyNetwork;

  /**
   * The swap transaction data returned by the createSwap method.
   */
  swap: CreateSwapResponse;

  /**
   * Optional idempotency key for the request.
   */
  idempotencyKey?: string;
}

/**
 * Result of submitting a swap operation.
 */
export interface SubmitSwapOperationResult {
  /**
   * The hash of the user operation.
   */
  userOpHash: Hex;

  /**
   * The status of the user operation.
   */
  status: "pending" | "signed" | "broadcast" | "complete" | "failed";
}

/**
 * Submits a swap via a user operation from a smart account.
 * This function handles integrating with permit2 if required by the swap.
 *
 * @param {CdpOpenApiClientType} client - The client to use for submitting the swap.
 * @param {SubmitSwapOperationOptions} options - The options for the swap submission.
 * @param {EvmSmartAccount} options.smartAccount - The smart account that will execute the swap.
 * @param {SendEvmTransactionBodyNetwork} options.network - The network to execute the swap on.
 * @param {CreateSwapResponse} options.swap - The swap transaction data returned by the createSwap method.
 * @param {string} [options.idempotencyKey] - Optional idempotency key for the request.
 *
 * @returns {Promise<SubmitSwapOperationResult>} A promise that resolves to the user operation result.
 *
 * @example **Submitting a swap via a smart account**
 * ```ts
 * // First create a swap
 * const swap = await cdp.evm.createSwap({
 *   network: "base",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: smartAccount.address
 * });
 *
 * // Check if liquidity is available
 * if (!swap.liquidityAvailable) {
 *   console.error("Insufficient liquidity for swap");
 *   return;
 * }
 *
 * // Submit the swap
 * const result = await submitSwapOperation(client, {
 *   smartAccount,
 *   network: "base",
 *   swap
 * });
 *
 * console.log(`Swap submitted with user operation hash: ${result.userOpHash}`);
 * ```
 */
export async function submitSwapOperation(
  client: CdpOpenApiClientType,
  options: SubmitSwapOperationOptions,
): Promise<SubmitSwapOperationResult> {
  const { smartAccount, network, swap, idempotencyKey } = options;

  // If the transaction doesn't exist, throw an error
  if (!swap.transaction) {
    throw new Error("No transaction data found in the swap");
  }

  let txData = swap.transaction.data as Hex;

  // If permit2 is needed, we need to first sign it using the owner account
  if (swap.permit2?.eip712) {
    // Get the first owner (currently only single owner is supported)
    const owner = smartAccount.owners[0];

    // Sign the Permit2 EIP-712 message
    const signature = await client.signEvmTypedData(
      owner.address,
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

  // Create the user operation with the prepared transaction
  const userOpResult = await sendUserOperation(client, {
    smartAccount,
    network,
    calls: [
      {
        to: swap.transaction.to as `0x${string}`,
        data: txData,
        // Only include value if it exists
        ...(swap.transaction.value ? { value: BigInt(swap.transaction.value) } : {}),
      },
    ],
    idempotencyKey,
  });

  return {
    userOpHash: userOpResult.userOpHash,
    status: userOpResult.status,
  };
}
