import * as chains from "viem/chains";

import type { Chain } from "viem";

/**
 * Network identifier to viem chain mapping
 */
export const NETWORK_TO_CHAIN_MAP: Record<string, Chain> = {
  base: chains.base,
  "base-sepolia": chains.baseSepolia,
  ethereum: chains.mainnet,
  "ethereum-sepolia": chains.sepolia,
  polygon: chains.polygon,
  "polygon-mumbai": chains.polygonMumbai,
  arbitrum: chains.arbitrum,
  "arbitrum-sepolia": chains.arbitrumSepolia,
  optimism: chains.optimism,
  "optimism-sepolia": chains.optimismSepolia,
};

/**
 * Resolves a network identifier to a viem chain
 *
 * @param network - The network identifier to resolve
 * @returns The resolved viem chain
 * @throws Error if the network identifier is not supported
 */
export function resolveNetworkToChain(network: string): Chain {
  const chain = NETWORK_TO_CHAIN_MAP[network.toLowerCase()];
  if (!chain) {
    throw new Error(`Unsupported network identifier: ${network}`);
  }
  return chain;
}
