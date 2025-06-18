import type { EvmServerAccount, NetworkScopedEvmServerAccount } from "./types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { Address } from "../../types/misc.js";

/**
 * Options for converting a pre-existing EvmAccount to a NetworkScopedEvmServerAccount.
 */
export type ToNetworkScopedEvmServerAccountOptions = {
  /** The EvmAccount that was previously created. */
  account: EvmServerAccount;
  /** The network to scope the account to. */
  network: string;
};

/**
 * Creates a Network-scoped Server-managed EvmAccount instance from an existing EvmAccount.
 * Use this to interact with previously deployed EvmAccounts on a specific network.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToNetworkScopedEvmServerAccountOptions} options - Configuration options.
 * @param {EvmServerAccount} options.account - The EvmServerAccount that was previously created.
 * @param {string} options.network - The network to scope the account to.
 * @returns {NetworkScopedEvmServerAccount} A configured NetworkScopedEvmServerAccount instance ready for signing.
 */
export function toNetworkScopedEvmServerAccount(
  apiClient: CdpOpenApiClientType,
  options: ToNetworkScopedEvmServerAccountOptions,
): NetworkScopedEvmServerAccount {
  const account: NetworkScopedEvmServerAccount = {
    address: options.account.address as Address,
    network: options.network,
    signMessage: options.account.signMessage,
    sign: options.account.sign,
    signTransaction: options.account.signTransaction,
    signTypedData: options.account.signTypedData,
    name: options.account.name,
    type: "evm-server",
    policies: options.account.policies,
  };

  return account;
}
