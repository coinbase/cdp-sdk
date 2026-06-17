/**
 * Adapter to bridge CDP SDK EVM accounts to x402 EVM signers.
 */

import { toClientEvmSigner } from "@x402/evm";

import type { EvmServerAccount } from "../../accounts/evm/types.js";
import type { ClientEvmSigner } from "@x402/evm";

/**
 * Converts a CDP EVM server account (EOA) into an x402-compatible signer.
 *
 * @param account - A CDP EVM account from CdpClient.evm.getOrCreateAccount()
 * @returns A ClientEvmSigner compatible with @x402/evm's registerExactEvmScheme
 *
 * @example
 * ```typescript
 * import { toX402Signer } from "@coinbase/cdp-sdk/x402";
 *
 * const account = await cdpClient.evm.getOrCreateAccount({ name: "my-wallet" });
 * const signer = toX402Signer(account);
 * registerExactEvmScheme(x402client, { signer });
 * ```
 */
export function fromCdpEvmAccount(account: EvmServerAccount): ClientEvmSigner {
  return toClientEvmSigner(account);
}
