/**
 * @module Client
 */

import {
  GetVaultOptions,
  LendClientInterface,
  ListVaultsOptions,
  ListVaultsResult,
} from "./lend.types.js";
import { Analytics } from "../../analytics.js";
import { UserInputValidationError } from "../../errors.js";
import { CdpOpenApiClient, Vault } from "../../openapi-client/index.js";

/**
 * The vault ID format from the OpenAPI `VaultId` schema. The generated client inserts the
 * ID into the request path unescaped, so it is validated before a request is signed.
 */
const VAULT_ID_PATTERN = /^vault_[a-f0-9-]{36}$/;

/**
 * The namespace containing all Lend methods.
 */
export class LendClient implements LendClientInterface {
  /**
   * Lists the vaults the project created. Each vault includes its
   * current metrics, such as APY and TVL, once a metrics snapshot has been observed for it.
   *
   * @param {ListVaultsOptions} [options] - Options for paginating the results.
   * @param {number} [options.pageSize] - The number of vaults to return per page, between 1 and 1000.
   * @param {string} [options.pageToken] - The page token from a previous response.
   *
   * @returns {Promise<ListVaultsResult>} A page of vaults.
   *
   * @example **List vaults**
   *          ```ts
   *          const { vaults } = await cdp.lend.listVaults();
   *          ```
   *
   * @example **With pagination**
   *          ```ts
   *          const firstPage = await cdp.lend.listVaults({ pageSize: 10 });
   *
   *          if (firstPage.nextPageToken) {
   *            const nextPage = await cdp.lend.listVaults({
   *              pageSize: 10,
   *              pageToken: firstPage.nextPageToken,
   *            });
   *          }
   *          ```
   */
  async listVaults(options: ListVaultsOptions = {}): Promise<ListVaultsResult> {
    Analytics.trackAction({
      action: "list_vaults",
    });

    try {
      const response = await CdpOpenApiClient.listVaults({
        pageSize: options.pageSize,
        pageToken: options.pageToken,
      });

      return {
        vaults: response.vaults,
        nextPageToken: response.nextPageToken,
      };
    } catch (error) {
      Analytics.trackError(error, "listVaults");
      throw error;
    }
  }

  /**
   * Gets a vault the project created, including its current metrics
   * such as APY and TVL.
   *
   * @param {GetVaultOptions} options - Options for getting the vault.
   * @param {string} options.vaultId - The ID of the vault.
   *
   * @returns {Promise<Vault>} The vault.
   * @throws {UserInputValidationError} If `vaultId` is not a `vault_`-prefixed UUID.
   *
   * @example
   *          ```ts
   *          const vault = await cdp.lend.getVault({
   *            vaultId: "vault_019f5f10-096a-7a23-86df-f479650d813f",
   *          });
   *          ```
   */
  async getVault(options: GetVaultOptions): Promise<Vault> {
    Analytics.trackAction({
      action: "get_vault",
    });

    if (typeof options.vaultId !== "string" || !VAULT_ID_PATTERN.test(options.vaultId)) {
      throw new UserInputValidationError("vaultId must be a vault_-prefixed UUID");
    }

    try {
      return await CdpOpenApiClient.getVault(options.vaultId);
    } catch (error) {
      Analytics.trackError(error, "getVault");
      throw error;
    }
  }
}
