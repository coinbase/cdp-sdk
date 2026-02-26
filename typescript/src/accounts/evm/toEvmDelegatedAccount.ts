import { toEvmSmartAccount } from "./toEvmSmartAccount.js";
import { CdpOpenApiClient } from "../../openapi-client/index.js";

import type { EvmServerAccount, EvmSmartAccount } from "./types.js";

/**
 * Creates an EvmSmartAccount view of a server account for use after EIP-7702 delegation.
 * Uses the API client configured by your CdpClient instance.
 *
 * The returned account has the same address as the EOA and uses the server account as owner,
 * so you can call sendUserOperation, waitForUserOperation, etc.
 *
 * @param account - The server account (EOA) that has been delegated via EIP-7702.
 * @returns An EvmSmartAccount view ready for user operation submission.
 */
export function toEvmDelegatedAccount(account: EvmServerAccount): EvmSmartAccount {
  return toEvmSmartAccount(CdpOpenApiClient, {
    smartAccount: {
      address: account.address,
      owners: [account.address],
      name: account.name,
      policies: account.policies,
    },
    owner: account,
  });
}
