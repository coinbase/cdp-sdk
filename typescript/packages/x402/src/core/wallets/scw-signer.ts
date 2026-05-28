/**
 * Adapter to bridge CDP SDK Smart Contract Wallet (SCW) accounts to x402 EVM signers.
 *
 * CDP Smart Accounts use ERC-4337 account abstraction. Their signTypedData method
 * requires a `network` parameter to route the request to the correct chain.
 * This module provides an adapter that maps the EIP-712 domain chainId to the
 * corresponding CDP SDK network name, allowing SCWs to be used with x402's
 * ClientEvmSigner interface.
 *
 * Design decisions:
 * - Chain context is derived automatically from EIP-712 domain.chainId so callers
 *   don't need to pass the network explicitly.
 * - The adapter is intentionally thin: it does not add replay-protection beyond
 *   what the underlying CDP smart wallet already provides.
 * - fromCdpSmartWallet is the canonical export name per the TDD; the legacy alias
 *   cdpSmartAccountToEvmSigner is also exported for compatibility with any existing
 *   code that references the earlier implementation.
 */

import { toClientEvmSigner } from "@x402/evm";
import type { ClientEvmSigner } from "@x402/evm";

/**
 * Maps EIP-155 chain IDs to CDP SDK network names for SCW typed-data signing.
 */
const CHAIN_ID_TO_CDP_NETWORK: Record<number, string> = {
  8453: "base",
  84532: "base-sepolia",
  42161: "arbitrum",
  10: "optimism",
  7777777: "zora",
  137: "polygon",
  56: "bnb",
  43114: "avalanche",
  11155111: "ethereum-sepolia",
};

/**
 * Minimal interface for a CDP Smart Account (EvmSmartAccount).
 * Matches the relevant methods from @coinbase/cdp-sdk's EvmSmartAccount.
 */
export interface CdpSmartAccount {
  address: `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTypedData(options: Record<string, any>): Promise<`0x${string}`>;
}

/**
 * Resolves a CDP SDK network name from an EIP-712 domain chain ID.
 *
 * @param chainId - The chain ID from the EIP-712 domain.
 * @returns The CDP SDK network name (e.g. "base-sepolia").
 * @throws {Error} If the chain ID is undefined or not supported by the CDP SDK.
 */
export function resolveNetworkFromChainId(chainId: number | undefined): string {
  if (chainId === undefined) {
    throw new Error(
      "Cannot derive CDP network: domain.chainId is missing from the typed data. " +
        "EIP-712 domain must include chainId when using a Smart Contract Wallet.",
    );
  }
  const network = CHAIN_ID_TO_CDP_NETWORK[chainId];
  if (!network) {
    throw new Error(
      `Unsupported chainId ${chainId} for CDP Smart Contract Wallet. ` +
        `Supported networks: ${Object.values(CHAIN_ID_TO_CDP_NETWORK).join(", ")}`,
    );
  }
  return network;
}

/**
 * Converts a CDP Smart Account (EvmSmartAccount) into an x402-compatible signer.
 *
 * CDP Smart Accounts differ from EOAs in that their signTypedData requires a
 * `network` parameter alongside the standard EIP-712 fields. This adapter
 * derives the network automatically from the EIP-712 domain's chainId, removing
 * the need to carry chain context through the call stack manually.
 *
 * @param account - A CDP Smart Account from CdpClient.evm.getOrCreateSmartAccount()
 * @returns A ClientEvmSigner compatible with @x402/evm's registerExactEvmScheme
 *
 * @example
 * ```typescript
 * import { fromCdpSmartWallet } from "@coinbase/x402";
 *
 * const owner = await cdpClient.evm.getOrCreateAccount({ name: "my-owner" });
 * const smartAccount = await cdpClient.evm.getOrCreateSmartAccount({
 *   name: "my-scw",
 *   owner,
 * });
 * const signer = fromCdpSmartWallet(smartAccount);
 * registerExactEvmScheme(x402client, { signer });
 * ```
 */
export function fromCdpSmartWallet(account: CdpSmartAccount): ClientEvmSigner {
  const signerShape = {
    address: account.address,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTypedData({ domain, types, primaryType, message }: any): Promise<`0x${string}`> {
      const chainId = domain?.chainId as number | undefined;
      const network = resolveNetworkFromChainId(chainId);
      return account.signTypedData({ domain, types, primaryType, message, network });
    },
  };
  return toClientEvmSigner(signerShape);
}

/** @deprecated Use fromCdpSmartWallet instead. */
export const cdpSmartAccountToEvmSigner = fromCdpSmartWallet;
