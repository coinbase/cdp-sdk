/* Network and RPC constants for the CDP x402 client. */

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
 * a dedicated RPC URL via `rpcUrls` config or `CDP_X402_RPC_URLS` env var.
 */
export const CDP_EVM_RPC_URLS: Record<string, { rpcUrl: string }> = {
  [baseMainnetCaip2]: { rpcUrl: "https://mainnet.base.org" },
  [baseSepoliaCaip2]: { rpcUrl: "https://sepolia.base.org" },
  [polygonCaip2]: { rpcUrl: "https://polygon-bor-rpc.publicnode.com" },
  [arbitrumCaip2]: { rpcUrl: "https://arb1.arbitrum.io/rpc" },
  [worldCaip2]: { rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public" },
  [worldSepoliaCaip2]: { rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public" },
};

/**
 * Per-network USDC contract / mint addresses for CDP-supported networks,
 * keyed by CAIP-2 network identifier.
 */
export const CDP_USDC_ADDRESSES = {
  [baseMainnetCaip2]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [baseSepoliaCaip2]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [polygonCaip2]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  [arbitrumCaip2]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  [worldCaip2]: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
  [worldSepoliaCaip2]: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
  [solanaMainnetCaip2]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  [solanaDevnetCaip2]: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
} as const;
