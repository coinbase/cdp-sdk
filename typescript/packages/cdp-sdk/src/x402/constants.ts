/* Network and RPC constants for x402 signing. */
import {
  EvmNetworkCriterionNetworksItem,
  X402V2Network,
} from "../openapi-client/generated/coinbaseDeveloperPlatformAPIs.schemas.js";

const EIP155_CAIP2_PREFIX = "eip155:";

/** CAIP-2 network identifiers for CDP-supported chains. */
export const baseMainnetCaip2 = X402V2Network["eip155:8453"];
export const baseSepoliaCaip2 = X402V2Network["eip155:84532"];
export const polygonCaip2 = X402V2Network["eip155:137"];
export const arbitrumCaip2 = X402V2Network["eip155:42161"];
export const worldCaip2 = X402V2Network["eip155:480"];
export const worldSepoliaCaip2 = X402V2Network["eip155:4801"];
export const solanaMainnetCaip2 = X402V2Network["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"];
export const solanaDevnetCaip2 = X402V2Network["solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"];

const CDP_X402_EVM_NETWORKS = [
  {
    caip2: baseMainnetCaip2,
    cdpNetwork: EvmNetworkCriterionNetworksItem.base,
    rpcUrl: "https://mainnet.base.org",
  },
  {
    caip2: baseSepoliaCaip2,
    cdpNetwork: EvmNetworkCriterionNetworksItem["base-sepolia"],
    rpcUrl: "https://sepolia.base.org",
  },
  {
    caip2: polygonCaip2,
    cdpNetwork: EvmNetworkCriterionNetworksItem.polygon,
    rpcUrl: "https://polygon-bor-rpc.publicnode.com",
  },
  {
    caip2: arbitrumCaip2,
    cdpNetwork: EvmNetworkCriterionNetworksItem.arbitrum,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  {
    caip2: worldCaip2,
    cdpNetwork: EvmNetworkCriterionNetworksItem.world,
    rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
  },
  {
    caip2: worldSepoliaCaip2,
    cdpNetwork: EvmNetworkCriterionNetworksItem["world-sepolia"],
    rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  },
] as const;

/**
 * Parses the EIP-155 chain ID from an EVM CAIP-2 network identifier.
 *
 * @param caip2 - CAIP-2 network identifier (e.g. `eip155:8453`).
 * @returns The numeric EIP-155 chain ID.
 */
function chainIdFromEip155Caip2(caip2: string): number {
  if (!caip2.startsWith(EIP155_CAIP2_PREFIX)) {
    throw new Error(`Expected EIP-155 CAIP-2 network, got "${caip2}".`);
  }

  const chainIdText = caip2.slice(EIP155_CAIP2_PREFIX.length);
  const chainId = Number(chainIdText);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`Invalid EIP-155 chain ID "${chainIdText}" in CAIP-2 network "${caip2}".`);
  }

  return chainId;
}

/**
 * Maps EIP-155 chain IDs to CDP SDK network names for SCW typed-data signing.
 *
 * x402-supported networks are derived from CAIP-2 values above. Additional
 * non-x402 signing networks are included directly in this full map.
 */
export const CHAIN_ID_TO_CDP_NETWORK: Record<number, string> = Object.fromEntries([
  ...CDP_X402_EVM_NETWORKS.map(({ caip2, cdpNetwork }) => [
    chainIdFromEip155Caip2(caip2),
    cdpNetwork,
  ]),
  [10, EvmNetworkCriterionNetworksItem.optimism],
  [7777777, EvmNetworkCriterionNetworksItem.zora],
  [56, EvmNetworkCriterionNetworksItem.bnb],
  [43114, EvmNetworkCriterionNetworksItem.avalanche],
  [11155111, EvmNetworkCriterionNetworksItem["ethereum-sepolia"]],
]);

/**
 * Public JSON-RPC endpoints for CDP-supported EVM networks, keyed by CAIP-2
 * network identifier.
 *
 * These are free-tier public RPCs. For production workloads consider supplying
 * a dedicated RPC URL via the `rpcUrls` config option or `CDP_X402_RPC_URLS`
 * environment variable.
 */
export const CDP_EVM_RPC_URLS: Record<string, { rpcUrl: string }> = {
  ...Object.fromEntries(CDP_X402_EVM_NETWORKS.map(({ caip2, rpcUrl }) => [caip2, { rpcUrl }])),
};
