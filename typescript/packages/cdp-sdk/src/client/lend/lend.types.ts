/**
 * @module Types
 */

import { Vault } from "../../openapi-client/index.js";

/**
 * The LendClient type, which reads the Lend vaults the project created.
 */
export interface LendClientInterface {
  listVaults: (options?: ListVaultsOptions) => Promise<ListVaultsResult>;
  getVault: (options: GetVaultOptions) => Promise<Vault>;
}

/**
 * Options for listing vaults.
 */
export interface ListVaultsOptions {
  /** The number of vaults to return per page, between 1 and 1000. Defaults to 20. */
  pageSize?: number;
  /** The page token from a previous response, to fetch the next page of vaults. */
  pageToken?: string;
}

/**
 * The result of listing vaults.
 */
export interface ListVaultsResult {
  /** The vaults created by the project. */
  vaults: Vault[];
  /**
   * The page token to fetch the next page of vaults.
   * If undefined, there are no more vaults to fetch.
   */
  nextPageToken?: string;
}

/**
 * Options for getting a vault.
 */
export interface GetVaultOptions {
  /** The ID of the vault, for example `vault_019f5f10-096a-7a23-86df-f479650d813f`. */
  vaultId: string;
}
