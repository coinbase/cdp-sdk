import { GetUserOperationOptions, UserOperation } from "../../client/evm/evm.types.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { Address, Hex } from "../../types/misc.js";

/**
 * Gets a user operation for a smart account by user operation hash.
 *
 * @param {CdpOpenApiClientType} client - The client to use to get the user operation.
 * @param {GetUserOperationOptions} options - Parameters for getting the user operation.
 * @param {SmartAccount} options.smartAccount - The smart account signing the user operation.
 * @param {string} options.userOpHash - The user operation hash.
 *
 * @returns A promise that resolves to the user operation.
 *
 * @example
 * ```ts
 * const userOp = await getUserOperation(client, {
 *   smartAccount,
 *   userOpHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
 * });
 * ```
 */
export async function getUserOperation(
  client: CdpOpenApiClientType,
  options: GetUserOperationOptions,
): Promise<UserOperation> {
  const address =
    typeof options.smartAccount === "string" ? options.smartAccount : options.smartAccount.address;

  const userOp = await client.getUserOperation(address, options.userOpHash);

  return {
    calls: userOp.calls.map(call => ({
      to: call.to as Address,
      value: BigInt(call.value),
      data: call.data as Hex,
    })),
    network: userOp.network,
    status: userOp.status,
    transactionHash: userOp.transactionHash as Hex | undefined,
    userOpHash: userOp.userOpHash as Hex,
    receipts: userOp.receipts,
  };
}
