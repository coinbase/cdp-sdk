/**
 * Adapter to bridge CDP SDK EVM accounts to x402 EVM signers.
 *
 * Provides a first-class export so callers don't need to discover
 * toClientEvmSigner as an undocumented bridge.
 */

import { toClientEvmSigner } from "@x402/evm";
import type { ClientEvmSigner } from "@x402/evm";

/**
 * Minimal interface for a CDP EVM account (EOA).
 * Matches the relevant methods from @coinbase/cdp-sdk's EvmServerAccount.
 */
export interface CdpEvmAccount {
  address: `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTypedData(params: any): Promise<`0x${string}`>;
}

/**
 * Converts a CDP EVM server account (EOA) into an x402-compatible signer.
 *
 * @param account - A CDP EVM account from CdpClient.evm.getOrCreateAccount()
 * @returns A ClientEvmSigner compatible with @x402/evm's registerExactEvmScheme
 *
 * @example
 * ```typescript
 * import { fromCdpEvmAccount } from "@coinbase/x402";
 *
 * const account = await cdpClient.evm.getOrCreateAccount({ name: "my-wallet" });
 * const signer = fromCdpEvmAccount(account);
 * registerExactEvmScheme(x402client, { signer });
 * ```
 */
export function fromCdpEvmAccount(account: CdpEvmAccount): ClientEvmSigner {
  return toClientEvmSigner(account);
}
