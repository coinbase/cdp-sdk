import type { ListSpendPermissionsOptions } from "../../client/evm/evm.types.js";
import type { CdpOpenApiClient, ListSpendPermissionsResult } from "../../openapi-client/index.js";

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
  return await client.listSpendPermissions(options.address, {
    pageSize: options.pageSize,
    pageToken: options.pageToken,
  });
}
