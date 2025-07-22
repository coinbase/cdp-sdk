import { serializeTransaction } from "viem";

import { TransactionRequestEIP1559 } from "../types/misc.js";

/**
 * Serializes a transaction for the Coinbase API.
 *
 * @param transaction - The transaction to serialize.
 * @returns The serialized transaction.
 */
export function serializeEIP1559Transaction(transaction: TransactionRequestEIP1559) {
  return serializeTransaction({
    ...transaction,
    chainId: 1, // ignored by Coinbase API
    type: "eip1559",
  });
}
