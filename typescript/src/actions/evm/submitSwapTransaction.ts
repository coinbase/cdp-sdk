import { concat, numberToHex, size } from "viem";

import { sendTransaction } from "./sendTransaction.js";

import type {
  CdpOpenApiClientType,
  CreateSwapResponse,
  SendEvmTransactionBodyNetwork,
} from "../../openapi-client/index.js";
import type { Address, Hex } from "../../types/misc.js";
import type { TransactionRequestEIP1559 } from "viem";

/**
 * Options for submitting a swap transaction.
 */
export interface SubmitSwapTransactionOptions {
  /**
   * The address of the account that will execute the swap.
   */
  address: Address;

  /**
   * The network to execute the swap on (e.g., "ethereum", "base").
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
 * Result of submitting a swap transaction.
 */
export interface SubmitSwapTransactionResult {
  /**
   * The transaction hash of the submitted swap.
   */
  transactionHash: Hex;
}

/**
 * Submits a swap transaction to the blockchain.
 * Handles any permit2 signatures required for the swap.
 *
 * @param {CdpOpenApiClientType} client - The client to use for submitting the swap.
 * @param {SubmitSwapTransactionOptions} options - The options for the swap submission.
 *
 * @returns {Promise<SubmitSwapTransactionResult>} A promise that resolves to the transaction hash.
 *
 * @example **Submitting a swap**
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
 * // Submit the swap
 * const result = await submitSwapTransaction(client, {
 *   address: account.address,
 *   network: "base",
 *   swap
 * });
 *
 * console.log(`Swap submitted with transaction hash: ${result.transactionHash}`);
 * ```
 */
export async function submitSwapTransaction(
  client: CdpOpenApiClientType,
  options: SubmitSwapTransactionOptions,
): Promise<SubmitSwapTransactionResult> {
  const { address, network, swap, idempotencyKey } = options;

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
