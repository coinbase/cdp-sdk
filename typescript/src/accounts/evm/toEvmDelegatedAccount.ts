import { toEvmSmartAccount } from "./toEvmSmartAccount.js";

import type { CdpOpenApiClientType } from "../../openapi-client/index.js";

import type { EvmServerAccount, EvmSmartAccount } from "./types.js";

/**
 * Options for converting a server account (EOA) to a delegated smart account view.
 * Use after the EOA has been upgraded via EIP-7702 delegation.
 */
export type ToEvmDelegatedAccountOptions = {
  /** The server account (EOA) that has been delegated via EIP-7702. */
  account: EvmServerAccount;
};

/**
 * Creates an EvmSmartAccount view of a server account for use after EIP-7702 delegation.
 * The returned account has the same address as the EOA and uses the server account as owner,
 * so you can call sendUserOperation, waitForUserOperation, etc.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToEvmDelegatedAccountOptions} options - Configuration options.
 * @param {EvmServerAccount} options.account - The server account (EOA) that has been delegated.
 * @returns {EvmSmartAccount} A smart account view ready for user operation submission.
 */
export function toEvmDelegatedAccount(
  apiClient: CdpOpenApiClientType,
  options: ToEvmDelegatedAccountOptions,
): EvmSmartAccount {
  const { account } = options;
  return toEvmSmartAccount(apiClient, {
    smartAccount: {
      address: account.address,
      owners: [account.address],
      name: account.name,
      policies: account.policies,
    },
    owner: account,
  });
}
