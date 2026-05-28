import { serializeTransaction, TransactionRequestEIP1559 } from "viem";

import type {
  CdpOpenApiClientType,
  SendEvmTransactionBodyNetwork,
} from "../../openapi-client/index.js";
import type { Address, Hex } from "../../types/misc.js";

/**
 * Options for sending an EVM transaction.
 */
export interface SendTransactionOptions {
  /** The address of the account. */
  address: Address;
  /**
   * The transaction to send. The chainId is ignored in favor of the `network` field.
   *
   * This can be either:
   * - An RLP-encoded transaction to sign and send, as a 0x-prefixed hex string, or
   * - An EIP-1559 transaction request object.
   */
  transaction: Hex | TransactionRequestEIP1559;
  /**
   * The network to send the transaction to.
   * The chainId in the `transaction` field is ignored in favor of this field.
   */
  network: SendEvmTransactionBodyNetwork;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Result of a transaction
 */
export interface TransactionResult {
  /** The hash of the transaction. */
  transactionHash: Hex;
}

/**
 * Sends an EVM transaction.
 *
 * @param apiClient - The API client.
 * @param options - The options for sending the transaction.
 *
 * @returns The result of the transaction.
 */
export async function sendTransaction(
  apiClient: CdpOpenApiClientType,
  options: SendTransactionOptions,
): Promise<TransactionResult> {
  const { address, network, idempotencyKey } = options;
  let transaction = options.transaction;

  if (typeof transaction !== "string") {
    transaction = serializeTransaction({
      ...transaction,
      // chainId is ignored in favor of network
      chainId: 1,
      type: "eip1559",
    });
  }

  const result = await apiClient.sendEvmTransaction(
    address,
    { transaction, network },
    idempotencyKey,
  );

  return {
    transactionHash: result.transactionHash as Hex,
  };
}
