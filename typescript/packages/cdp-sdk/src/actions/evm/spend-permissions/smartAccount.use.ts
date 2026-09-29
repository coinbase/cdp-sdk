import { buildSpendCalldata } from "../../../spend-permissions/utils.js";
import { type SendUserOperationReturnType, sendUserOperation } from "../sendUserOperation.js";

import type { UseSpendPermissionOptions } from "./types.js";
import type { EvmSmartAccount } from "../../../accounts/evm/types.js";
import type {
  CdpOpenApiClientType,
  EvmUserOperationNetwork,
} from "../../../openapi-client/index.js";

/**
 * Use a spend permission to spend tokens. Dispatches automatically to either
 * `SpendPermissionManager.spend` (legacy permissions) or `SpendRouter.spendAndRoute`
 * (CDP-created permissions whose onchain spender is the SpendRouter contract).
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

  const { to, data } = buildSpendCalldata(spendPermission, value);

  return sendUserOperation(apiClient, {
    smartAccount: account,
    network: network as EvmUserOperationNetwork,
    calls: [
      {
        to,
        data,
        value: 0n,
      },
    ],
  });
}
