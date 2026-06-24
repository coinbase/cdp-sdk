/* Network and RPC constants for x402 signing. */

/** CAIP-2 network identifiers for CDP-supported chains. */
export const baseMainnetCaip2 = "eip155:8453" as const;
export const baseSepoliaCaip2 = "eip155:84532" as const;
export const polygonCaip2 = "eip155:137" as const;
export const arbitrumCaip2 = "eip155:42161" as const;
export const worldCaip2 = "eip155:480" as const;
export const worldSepoliaCaip2 = "eip155:4801" as const;
export const solanaMainnetCaip2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" as const;
export const solanaDevnetCaip2 = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;

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
