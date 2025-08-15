import type { SpendPermissionNetwork } from "../../../openapi-client/index.js";
import type { SpendPermission } from "../../../spend-permissions/types.js";

/**
 * Options for using a spend permission
 */
export type UseSpendPermissionOptions = {
  /** The spend permission to use */
  spendPermission: SpendPermission;
  /** The amount to spend (must be &le; allowance) */
  value: bigint;
  /** The network to execute the transaction on */
  network: SpendPermissionNetwork;
};
