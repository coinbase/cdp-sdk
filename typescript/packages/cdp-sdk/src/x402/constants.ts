/* Network and RPC constants for x402 signing. */
import {
  EvmNetworkCriterionNetworksItem,
  X402V2Network,
} from "../openapi-client/generated/coinbaseDeveloperPlatformAPIs.schemas.js";

const EIP155_CAIP2_PREFIX = "eip155:";

const baseMainnetChainId = 8453;
const baseSepoliaChainId = 84532;
const polygonChainId = 137;
const arbitrumChainId = 42161;
const worldChainId = 480;
const worldSepoliaChainId = 4801;
const optimismChainId = 10;
const zoraChainId = 7777777;
const bnbChainId = 56;
const avalancheChainId = 43114;
const ethereumSepoliaChainId = 11155111;

/**
 * Maps EIP-155 chain IDs to CDP SDK network names for SCW typed-data signing.
 *
 * EVM CAIP-2 identifiers are derived from these chain IDs using `toEip155Caip2`.
 */
export const CHAIN_ID_TO_CDP_NETWORK: Record<number, string> = {
  [baseMainnetChainId]: EvmNetworkCriterionNetworksItem.base,
  [baseSepoliaChainId]: EvmNetworkCriterionNetworksItem["base-sepolia"],
  [polygonChainId]: EvmNetworkCriterionNetworksItem.polygon,
  [arbitrumChainId]: EvmNetworkCriterionNetworksItem.arbitrum,
  [worldChainId]: EvmNetworkCriterionNetworksItem.world,
  [worldSepoliaChainId]: EvmNetworkCriterionNetworksItem["world-sepolia"],
  [optimismChainId]: EvmNetworkCriterionNetworksItem.optimism,
  [zoraChainId]: EvmNetworkCriterionNetworksItem.zora,
  [bnbChainId]: EvmNetworkCriterionNetworksItem.bnb,
  [avalancheChainId]: EvmNetworkCriterionNetworksItem.avalanche,
  [ethereumSepoliaChainId]: EvmNetworkCriterionNetworksItem["ethereum-sepolia"],
} as const;

/** CAIP-2 network identifiers for CDP-supported chains. */
export const baseMainnetCaip2 = toEip155Caip2(baseMainnetChainId);
export const baseSepoliaCaip2 = toEip155Caip2(baseSepoliaChainId);
export const polygonCaip2 = toEip155Caip2(polygonChainId);
export const arbitrumCaip2 = toEip155Caip2(arbitrumChainId);
export const worldCaip2 = toEip155Caip2(worldChainId);
export const worldSepoliaCaip2 = toEip155Caip2(worldSepoliaChainId);
export const solanaMainnetCaip2 = X402V2Network["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"];
export const solanaDevnetCaip2 = X402V2Network["solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"];

/**
 * Converts an EIP-155 chain ID into a typed CAIP-2 identifier.
 *
 * @param chainId - EIP-155 chain ID.
 * @returns CAIP-2 network identifier in `eip155:<chainId>` format.
 */
function toEip155Caip2<const ChainId extends number>(chainId: ChainId): `eip155:${ChainId}` {
  return `${EIP155_CAIP2_PREFIX}${chainId}` as const;
}

/**
 * Maps CDP SDK network names to their EIP-155 CAIP-2 identifiers.
 *
 * Derived by inverting CHAIN_ID_TO_CDP_NETWORK. Used by network-scoped account
 * builders to validate that an accepted x402 requirement targets the scoped network.
 * Networks not present here (e.g. raw RPC URLs) cause the scoped check to be skipped.
 */
export const CDP_NETWORK_TO_CAIP2: Record<string, string> = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_CDP_NETWORK).map(([chainId, networkName]) => [
    networkName,
    `eip155:${chainId}`,
  ]),
);

/**
 * Public JSON-RPC endpoints for CDP-supported EVM networks, keyed by CAIP-2
 * network identifier.
 *
 * These are free-tier public RPCs. For production workloads consider supplying
 * a dedicated RPC URL via the `rpcUrls` config option or `CDP_X402_RPC_URLS`
 * environment variable.
 */
export const CDP_EVM_RPC_URLS: Record<string, { rpcUrl: string }> = {
  [baseMainnetCaip2]: { rpcUrl: "https://mainnet.base.org" },
  [baseSepoliaCaip2]: { rpcUrl: "https://sepolia.base.org" },
  [polygonCaip2]: { rpcUrl: "https://polygon-bor-rpc.publicnode.com" },
  [arbitrumCaip2]: { rpcUrl: "https://arb1.arbitrum.io/rpc" },
  [worldCaip2]: { rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public" },
  [worldSepoliaCaip2]: { rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public" },
};
