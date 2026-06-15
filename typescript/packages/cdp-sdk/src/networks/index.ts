/**
 * Canonical network and asset registry for the Coinbase Developer Platform SDK.
 *
 * Single source of truth for CAIP-2 network identifiers, USDC addresses
 * (EVM and SVM), public RPC endpoints, and chainId ↔ CDP-network mappings.
 *
 * @module Networks
 */

import * as chains from "viem/chains";

import type { Chain } from "viem";

/*
 * ---------------------------------------------------------------------------
 * CAIP-2 network identifiers
 * ---------------------------------------------------------------------------
 */

export const baseMainnetCaip2 = "eip155:8453" as const;
export const baseSepoliaCaip2 = "eip155:84532" as const;
export const polygonCaip2 = "eip155:137" as const;
export const arbitrumCaip2 = "eip155:42161" as const;
export const worldCaip2 = "eip155:480" as const;
export const worldSepoliaCaip2 = "eip155:4801" as const;
export const solanaMainnetCaip2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" as const;
export const solanaDevnetCaip2 = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;

/*
 * ---------------------------------------------------------------------------
 * Solana USDC mint addresses (canonical source; re-exported by actions/solana/constants.ts)
 * ---------------------------------------------------------------------------
 */

export const USDC_MAINNET_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DEVNET_MINT_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// Solana genesis hashes (full base58-encoded genesis block hashes)
export const GENESIS_HASH_MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" as const;
export const GENESIS_HASH_DEVNET = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" as const;
export const GENESIS_HASH_TESTNET = "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY" as const;

/*
 * ---------------------------------------------------------------------------
 * CDP facilitator networks
 * ---------------------------------------------------------------------------
 */

export const CDP_FACILITATOR_NETWORKS = [
  baseMainnetCaip2,
  baseSepoliaCaip2,
  polygonCaip2,
  arbitrumCaip2,
  worldCaip2,
  worldSepoliaCaip2,
  solanaMainnetCaip2,
  solanaDevnetCaip2,
] as const;

export type CdpFacilitatorNetwork = (typeof CDP_FACILITATOR_NETWORKS)[number];

/*
 * ---------------------------------------------------------------------------
 * Per-network USDC contract / mint addresses
 * ---------------------------------------------------------------------------
 */

export const CDP_USDC_ADDRESSES = {
  [baseMainnetCaip2]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [baseSepoliaCaip2]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [polygonCaip2]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  [arbitrumCaip2]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  [worldCaip2]: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
  [worldSepoliaCaip2]: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
  [solanaMainnetCaip2]: USDC_MAINNET_MINT_ADDRESS,
  [solanaDevnetCaip2]: USDC_DEVNET_MINT_ADDRESS,
} as const satisfies Record<CdpFacilitatorNetwork, string>;

export type CdpUsdcNetwork = keyof typeof CDP_USDC_ADDRESSES;
export type CdpUsdcAddress = (typeof CDP_USDC_ADDRESSES)[CdpUsdcNetwork];

/*
 * ---------------------------------------------------------------------------
 * Public JSON-RPC endpoints for CDP-supported EVM networks
 * ---------------------------------------------------------------------------
 */

export const CDP_EVM_RPC_URLS: Record<string, { rpcUrl: string }> = {
  [baseMainnetCaip2]: { rpcUrl: "https://mainnet.base.org" },
  [baseSepoliaCaip2]: { rpcUrl: "https://sepolia.base.org" },
  [polygonCaip2]: { rpcUrl: "https://polygon-bor-rpc.publicnode.com" },
  [arbitrumCaip2]: { rpcUrl: "https://arb1.arbitrum.io/rpc" },
  [worldCaip2]: { rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public" },
  [worldSepoliaCaip2]: { rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public" },
};

/*
 * ---------------------------------------------------------------------------
 * chainId ↔ CDP network name bidirectional mapping
 * ---------------------------------------------------------------------------
 */

/**
 * Maps EIP-155 chain IDs to CDP SDK network names.
 * This is the canonical source — replaces CHAIN_ID_TO_CDP_NETWORK in x402.
 * Contains only networks with KnownEvmNetworks support in the CDP SDK.
 */
export const CHAIN_ID_TO_CDP_NETWORK: Record<number, string> = {
  1: "ethereum",
  11155111: "ethereum-sepolia",
  17000: "ethereum-hoodi",
  8453: "base",
  84532: "base-sepolia",
  137: "polygon",
  80001: "polygon-mumbai",
  42161: "arbitrum",
  421614: "arbitrum-sepolia",
  10: "optimism",
  11155420: "optimism-sepolia",
  480: "world",
  4801: "world-sepolia",
};

/**
 * Extended chain ID map used by x402 SCW signers.
 * Includes additional chains (zora, bnb, avalanche) beyond the standard KnownEvmNetworks.
 */
const EXTENDED_CHAIN_ID_TO_CDP_NETWORK: Record<number, string> = {
  ...CHAIN_ID_TO_CDP_NETWORK,
  7777777: "zora",
  56: "bnb",
  43114: "avalanche",
};

/**
 * Resolves a CDP SDK network name from an EIP-155 chain ID.
 * Used by x402 SCW signers to route typed data signing to the correct chain.
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
  const network = EXTENDED_CHAIN_ID_TO_CDP_NETWORK[chainId];
  if (!network) {
    throw new Error(
      `Unsupported chainId ${chainId} for CDP Smart Contract Wallet. ` +
        `Supported networks: ${Object.values(EXTENDED_CHAIN_ID_TO_CDP_NETWORK).join(", ")}`,
    );
  }
  return network;
}

/*
 * ---------------------------------------------------------------------------
 * CDP network name → viem chain (from networkToChainResolver)
 * ---------------------------------------------------------------------------
 */

/**
 * Network identifier to viem chain mapping.
 * Canonical source — replaces NETWORK_TO_CHAIN_MAP in networkToChainResolver.ts.
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
 * Resolves a CDP network identifier to a viem chain.
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

/**
 * Maps a viem chain to a Coinbase network identifier.
 * This function only supports the networks defined in KnownEvmNetworks.
 *
 * @param chain - The viem chain object
 * @returns The Coinbase network identifier, or undefined if the chain is not supported
 */
export function mapChainToNetwork(chain: Chain): string | undefined {
  return CHAIN_ID_TO_CDP_NETWORK[chain.id];
}
