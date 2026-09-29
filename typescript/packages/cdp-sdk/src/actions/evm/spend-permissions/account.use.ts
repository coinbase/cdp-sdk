import { buildSpendCalldata } from "../../../spend-permissions/utils.js";
import { serializeEIP1559Transaction } from "../../../utils/serializeTransaction.js";

import type { UseSpendPermissionOptions } from "./types.js";
import type {
  CdpOpenApiClientType,
  SendEvmTransactionBodyNetwork,
} from "../../../openapi-client/index.js";
import type { Address, Hex } from "../../../types/misc.js";
import type { TransactionResult } from "../sendTransaction.js";

/**
 * Use a spend permission to spend tokens. Dispatches automatically to either
 * `SpendPermissionManager.spend` (legacy permissions) or `SpendRouter.spendAndRoute`
 * (CDP-created permissions whose onchain spender is the SpendRouter contract).
 *
 * @param apiClient - The API client to use.
 * @param address - The address of the account to use the spend permission on.
 * @param options - The options for the spend permission.
 *
 * @returns The transaction hash of the spend permission.
 */
export async function useSpendPermission(
  apiClient: CdpOpenApiClientType,
  address: Address,
  options: UseSpendPermissionOptions,
): Promise<TransactionResult> {
  const { spendPermission, value, network } = options;

  const { to, data } = buildSpendCalldata(spendPermission, value);

  const result = await apiClient.sendEvmTransaction(address, {
    transaction: serializeEIP1559Transaction({ to, data }),
    network: network as SendEvmTransactionBodyNetwork,
  });

  return {
    transactionHash: result.transactionHash as Hex,
  };
}
