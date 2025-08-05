import { resolveTokenAddress } from "../../../spend-permissions/utils.js";

import type { SpendPermissionInput } from "../../../client/evm/evm.types.js";
import type { SpendPermission, SpendPermissionNetworks } from "../../../spend-permissions/types.js";

/**
 * Resolve a spend permission input to a spend permission.
 *
 * @param spendPermissionInput - The spend permission input to resolve.
 * @param network - The network to resolve the spend permission for.
 *
 * @returns The resolved spend permission.
 */
export function resolveSpendPermission(
  spendPermissionInput: SpendPermissionInput,
  network: SpendPermissionNetworks,
): SpendPermission {
  return {
    ...spendPermissionInput,
    token: resolveTokenAddress(spendPermissionInput.token, network),
    salt: spendPermissionInput.salt ?? 0n,
    extraData: spendPermissionInput.extraData ?? "0x",
  };
}
