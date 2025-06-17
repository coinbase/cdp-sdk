import type { EvmAccount, EvmSmartAccount, NetworkScopedEvmSmartAccount } from "./types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";

/**
 * Options for converting a pre-existing EvmSmartAccount and owner to a EvmSmartAccount
 */
export type ToEvmSmartAccountOptions = {
  /** The pre-existing EvmSmartAccount. */
  smartAccount: EvmSmartAccount;
  /** The network to scope the smart account object to. */
  network: string;
  /** The owner of the smart account. */
  owner: EvmAccount;
};

/**
 * Creates a NetworkScopedEvmSmartAccount instance from an existing EvmSmartAccount and owner.
 * Use this to interact with previously deployed EvmSmartAccounts, rather than creating new ones.
 *
 * The owner must be the original owner of the evm smart account.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToEvmSmartAccountOptions} options - Configuration options.
 * @param {EvmSmartAccount} options.smartAccount - The deployed evm smart account.
 * @param {EvmAccount} options.owner - The owner which signs for the smart account.
 * @returns {NetworkScopedEvmSmartAccount} A configured NetworkScopedEvmSmartAccount instance ready for user operation submission.
 */
export function toNetworkScopedEvmSmartAccount(
  apiClient: CdpOpenApiClientType,
  options: ToEvmSmartAccountOptions,
): NetworkScopedEvmSmartAccount {
  const account: NetworkScopedEvmSmartAccount = {
    address: options.smartAccount.address,
    network: options.network,
    owners: [options.owner],
    name: options.smartAccount.name,
    type: "evm-smart",
  };

  return account;
}
