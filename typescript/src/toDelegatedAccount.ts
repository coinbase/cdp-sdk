import { toEvmDelegatedAccount } from "./accounts/evm/toEvmDelegatedAccount.js";
import { CdpOpenApiClient } from "./openapi-client/index.js";

import type { EvmServerAccount, EvmSmartAccount } from "./accounts/evm/types.js";

/**
 * Returns a smart account view of a server account for use after EIP-7702 delegation.
 * Use this to send user operations with an EOA that has been upgraded via
 * `cdp.evm.createEvmEip7702Delegation`.
 *
 * @param account - The server account (EOA) that has been delegated.
 * @returns A smart account with the same address as the EOA, ready for sendUserOperation, etc.
 *
 * @example
 * ```ts
 * import { CdpClient, toDelegatedAccount } from "@coinbase/cdp-sdk";
 *
 * const cdp = new CdpClient();
 * const account = await cdp.evm.getOrCreateAccount({ name: "MyAccount" });
 * await cdp.evm.createEvmEip7702Delegation(account.address, { network: "base-sepolia" });
 * const delegated = toDelegatedAccount(account);
 * await delegated.sendUserOperation({ network: "base-sepolia", calls: [...] });
 * ```
 */
export function toDelegatedAccount(account: EvmServerAccount): EvmSmartAccount {
  return toEvmDelegatedAccount(CdpOpenApiClient, { account });
}
