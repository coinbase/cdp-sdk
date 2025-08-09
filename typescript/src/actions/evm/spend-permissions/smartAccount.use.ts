import { encodeFunctionData } from "viem";

import {
  SPEND_PERMISSION_MANAGER_ABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
} from "../../../spend-permissions/constants.js";
import { type SendUserOperationReturnType, sendUserOperation } from "../sendUserOperation.js";

import type { UseSpendPermissionOptions } from "./types.js";
import type { EvmSmartAccount } from "../../../accounts/evm/types.js";
import type {
  CdpOpenApiClientType,
  EvmUserOperationNetwork,
} from "../../../openapi-client/index.js";

/**
 * Use a spend permission to spend tokens.
 *
 * @param apiClient - The API client to use.
 * @param account - The smart account to use.
 * @param options - The options for the spend permission.
 *
 * @returns The result of the spend permission.
 */
export function useSpendPermission(
  apiClient: CdpOpenApiClientType,
  account: EvmSmartAccount,
  options: UseSpendPermissionOptions,
): Promise<SendUserOperationReturnType> {
  const { spendPermission, value, network } = options;

  const data = encodeFunctionData({
    abi: SPEND_PERMISSION_MANAGER_ABI,
    functionName: "spend",
    args: [spendPermission, value],
  });

  return sendUserOperation(apiClient, {
    smartAccount: account,
    network: network as EvmUserOperationNetwork,
    calls: [
      {
        to: SPEND_PERMISSION_MANAGER_ADDRESS,
        data,
        value: 0n,
      },
    ],
  });
}
