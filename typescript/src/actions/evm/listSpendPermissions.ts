import type {
  CdpOpenApiClient,
  ListResponse,
  SpendPermissionResponseObject as SpendPermissionResponseObjectApi,
} from "../../openapi-client/index.js";
import type {
  ListSpendPermissionsOptions,
  SpendPermission,
} from "../../spend-permissions/types.js";
import type { Address, Hex } from "../../types/misc.js";

export type SpendPermissionResponseObject = Omit<
  SpendPermissionResponseObjectApi,
  "permission" | "permissionHash"
> & {
  permissionHash: Hex;
  permission: SpendPermission;
};

export type ListSpendPermissionsResult = ListResponse & {
  spendPermissions: SpendPermissionResponseObject[];
};

/**
 * Lists the spend permissions for a smart account.
 *
 * @param client - The OpenApiClient instance.
 * @param options - The options for listing the spend permissions.
 *
 * @returns A promise that resolves to the spend permissions.
 */
export async function listSpendPermissions(
  client: typeof CdpOpenApiClient,
  options: ListSpendPermissionsOptions,
): Promise<ListSpendPermissionsResult> {
  const result = await client.listSpendPermissions(options.address, {
    pageSize: options.pageSize,
    pageToken: options.pageToken,
  });

  return {
    spendPermissions: result.spendPermissions.map(permission => ({
      ...permission,
      permissionHash: permission.permissionHash as Hex,
      permission: {
        ...permission.permission,
        account: permission.permission.account as Address,
        spender: permission.permission.spender as Address,
        token: permission.permission.token as Address,
        allowance: BigInt(permission.permission.allowance),
        period: Number(permission.permission.period),
        start: Number(permission.permission.start),
        end: Number(permission.permission.end),
        salt: BigInt(permission.permission.salt),
        extraData: permission.permission.extraData as Hex,
      },
    })),
  };
}
