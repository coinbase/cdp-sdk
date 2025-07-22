import {
  EvmUserOperationStatus,
  EvmUserOperation,
  CdpOpenApiClientType,
} from "../../openapi-client/index.js";
import { wait, WaitOptions } from "../../utils/wait.js";

import type { Address, Hex } from "../../types/misc.js";

/**
 * Options for waiting for a user operation.
 */
export type WaitForUserOperationOptions = {
  /** The hash of the user operation. */
  userOpHash: Hex;
  /** The address of the smart account. */
  smartAccountAddress: Address;
  /** Optional options for the wait operation. */
  waitOptions?: WaitOptions;
};

/**
 * Represents a failed user operation.
 */
export type FailedOperation = {
  /** The address of the smart account. */
  smartAccountAddress: Address;
  /** The status of the user operation. */
  status: typeof EvmUserOperationStatus.failed;
  /** The hash of the user operation. This is not the transaction hash which is only available after the operation is completed.*/
  userOpHash: Hex;
};

/**
 * Represents a completed user operation.
 */
export type CompletedOperation = {
  /** The address of the smart account. */
  smartAccountAddress: Address;
  /** The transaction hash that executed the completed user operation. */
  transactionHash: string;
  /** The status of the user operation. */
  status: typeof EvmUserOperationStatus.complete;
  /** The hash of the user operation. This is not the transaction hash which is only available after the operation is completed.*/
  userOpHash: Hex;
};

/**
 * Represents the return type of the waitForUserOperation function.
 */
export type WaitForUserOperationReturnType = FailedOperation | CompletedOperation;

/**
 * Waits for a user operation to complete or fail.
 *
 * @example
 * ```ts
 * import { waitForUserOperation } from "@coinbase/cdp-sdk";
 *
 * const result = await waitForUserOperation(client, {
 *   userOpHash: "0x1234567890123456789012345678901234567890",
 *   smartAccountAddress: "0x1234567890123456789012345678901234567890",
 *   waitOptions: {
 *     timeoutSeconds: 30,
 *   },
 * });
 * ```
 *
 * @param {CdpOpenApiClientType} client - The client to use to wait for the user operation.
 * @param {WaitForUserOperationOptions} options - The options for the wait operation.
 * @returns {Promise<WaitForUserOperationReturnType>} The result of the user operation.
 */
export async function waitForUserOperation(
  client: CdpOpenApiClientType,
  options: WaitForUserOperationOptions,
): Promise<WaitForUserOperationReturnType> {
  const { userOpHash, smartAccountAddress } = options;

  const reload = async () => {
    const response = await client.getUserOperation(smartAccountAddress, userOpHash);
    return response;
  };

  const transform = (operation: EvmUserOperation): WaitForUserOperationReturnType => {
    if (operation.status === EvmUserOperationStatus.failed) {
      return {
        smartAccountAddress: smartAccountAddress,
        status: EvmUserOperationStatus.failed,
        userOpHash: operation.userOpHash as Hex,
      } satisfies FailedOperation;
    } else if (operation.status === EvmUserOperationStatus.complete) {
      return {
        smartAccountAddress: smartAccountAddress,
        transactionHash: operation.transactionHash!,
        status: EvmUserOperationStatus.complete,
        userOpHash: operation.userOpHash as Hex,
      } satisfies CompletedOperation;
    } else {
      throw new Error("User operation is not terminal");
    }
  };

  const waitOptions = options.waitOptions || {
    timeoutSeconds: 30,
  };

  return await wait(reload, isTerminal, transform, waitOptions);
}

const isTerminal = (operation: EvmUserOperation): boolean => {
  return (
    operation.status === EvmUserOperationStatus.complete ||
    operation.status === EvmUserOperationStatus.failed
  );
};
