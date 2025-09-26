import { CdpOpenApiClientType, Transfer, TransferStatus } from "../openapi-client/index.js";
import { wait, WaitOptions } from "../utils/wait.js";

/**
 * Options for waiting for a fund operation.
 */
export type WaitForFundOperationOptions = {
  /** The ID of the transfer to wait for. */
  transferId: string;
  /** Optional options for the wait operation. */
  waitOptions?: WaitOptions;
};

/**
 * Represents a failed fund operation.
 */
export type FailedFundOperation = {
  /** The ID of the transfer. */
  id: string;
  /** The network that the transfer was created on. */
  network: string;
  /** The target amount that will be received. */
  targetAmount: string;
  /** The currency that will be received. */
  targetCurrency: string;
  /** The status of the transfer. */
  status: typeof TransferStatus.failed;
};

/**
 * Represents a completed fund operation.
 */
export type CompletedFundOperation = {
  /** The ID of the transfer. */
  id: string;
  /** The network that the transfer was created on. */
  network: string;
  /** The target amount that will be received. */
  targetAmount: string;
  /** The currency that will be received. */
  targetCurrency: string;
  /** The status of the transfer. */
  status: typeof TransferStatus.completed;
  /** The transaction hash of the transfer. */
  transactionHash: string;
};

/**
 * Represents the return type of the waitForFundOperation function.
 */
export type WaitForFundOperationResult = FailedFundOperation | CompletedFundOperation;

/**
 * Waits for a fund operation to complete or fail.
 *
 * @deprecated This method will be removed in a future version. Consider using our Onramp API instead. See https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order.
 * @example
 * ```ts
 * import { waitForFundOperation } from "@coinbase/cdp-sdk";
 *
 * const result = await waitForFundOperation(client, {
 *   transferId: "0x1234567890123456789012345678901234567890",
 *   waitOptions: {
 *     timeoutSeconds: 30,
 *   },
 * });
 * ```
 *
 * @param {CdpOpenApiClientType} client - The client to use to wait for the fund operation.
 * @param {WaitForFundOperationOptions} options - The options for the wait operation.
 * @returns {Promise<WaitForFundOperationResult>} The result of the fund operation.
 */
export async function waitForFundOperationReceipt(
  client: CdpOpenApiClientType,
  options: WaitForFundOperationOptions,
): Promise<WaitForFundOperationResult> {
  const { transferId } = options;

  const reload = async () => {
    const response = await client.getPaymentTransfer(transferId);
    return response;
  };

  const transform = (operation: Transfer): WaitForFundOperationResult => {
    if (operation.status === TransferStatus.failed) {
      return {
        id: operation.id,
        network: operation.target.network,
        targetAmount: operation.targetAmount,
        targetCurrency: operation.targetCurrency,
        status: operation.status,
      } satisfies FailedFundOperation;
    } else if (operation.status === TransferStatus.completed) {
      return {
        id: operation.id,
        network: operation.target.network,
        targetAmount: operation.targetAmount,
        targetCurrency: operation.targetCurrency,
        status: operation.status,
        transactionHash: operation.transactionHash!,
      } satisfies CompletedFundOperation;
    } else {
      throw new Error("Transfer is not terminal");
    }
  };

  const waitOptions = options.waitOptions || {
    timeoutSeconds: 900,
    intervalSeconds: 1,
  };

  return await wait(reload, isTerminal, transform, waitOptions);
}

const isTerminal = (operation: Transfer): boolean => {
  return (
    operation.status === TransferStatus.completed || operation.status === TransferStatus.failed
  );
};
