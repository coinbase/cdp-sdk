/**
 * Adapter to bridge CDP SDK Smart Contract Wallet (SCW) accounts to x402 EVM signers.
 *
 * CDP Smart Accounts use ERC-4337 account abstraction. Their signTypedData method
 * requires a `network` parameter to route the request to the correct chain.
 */

import { toClientEvmSigner } from "@x402/evm";

import { resolveNetworkFromChainId } from "../../networks/index.js";

import type { EvmSmartAccount } from "../../accounts/evm/types.js";
import type { ClientEvmSigner } from "@x402/evm";

export { resolveNetworkFromChainId } from "../../networks/index.js";

/**
 * Converts a CDP Smart Account (EvmSmartAccount) into an x402-compatible signer.
 *
 * Chain context is derived automatically from EIP-712 domain.chainId so callers
 * don't need to pass the network explicitly.
 *
 * @param account - A CDP Smart Account from CdpClient.evm.getOrCreateSmartAccount()
 * @returns A ClientEvmSigner compatible with @x402/evm's registerExactEvmScheme
 *
 * @example
 * ```typescript
 * import { toX402Signer } from "@coinbase/cdp-sdk/x402";
 *
 * const owner = await cdpClient.evm.getOrCreateAccount({ name: "my-owner" });
 * const smartAccount = await cdpClient.evm.getOrCreateSmartAccount({
 *   name: "my-scw",
 *   owner,
 * });
 * const signer = toX402Signer(smartAccount);
 * registerExactEvmScheme(x402client, { signer });
 * ```
 */
export function fromCdpSmartWallet(account: EvmSmartAccount): ClientEvmSigner {
  const signerShape = {
    address: account.address,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTypedData({ domain, types, primaryType, message }: any): Promise<`0x${string}`> {
      const chainId = domain?.chainId as number | undefined;
      const network = resolveNetworkFromChainId(chainId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return account.signTypedData({ domain, types, primaryType, message, network } as any);
    },
  };
  return toClientEvmSigner(signerShape);
}

/** @deprecated Use fromCdpSmartWallet instead. */
export const cdpSmartAccountToEvmSigner = fromCdpSmartWallet;
