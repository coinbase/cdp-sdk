import type { KnownEvmNetworks } from "./types.js";
import type { Chain } from "viem";

/**
 * Maps a viem chain to a Coinbase network identifier.
 * This function only supports the networks defined in KnownEvmNetworks.
 *
 * @param chain - The viem chain object
 * @returns The Coinbase network identifier, or undefined if the chain is not supported
 */
export function mapChainToNetwork(chain: Chain): KnownEvmNetworks | undefined {
  // Map chain IDs to Coinbase network identifiers
  const chainIdToNetwork: Record<number, KnownEvmNetworks> = {
    // Ethereum networks
    1: "ethereum",
    11155111: "ethereum-sepolia",
    17000: "ethereum-hoodi", // Holesky

    // Base networks
    8453: "base",
    84532: "base-sepolia",

    // Polygon networks
    137: "polygon",
    80001: "polygon-mumbai",

    // Arbitrum networks
    42161: "arbitrum",
    421614: "arbitrum-sepolia",

    // Optimism networks
    10: "optimism",
    11155420: "optimism-sepolia",
  };

  return chainIdToNetwork[chain.id];
}
