/**
 * Normalization helpers used by the spend-control allow-lists.
 *
 * Allow-list comparisons need to be consistent with the values that appear in
 * a `PaymentRequirements` payload. The rules per chain family are:
 *
 * - **EVM**: Addresses and contract identifiers are compared case-insensitively.
 *   Both CAIP-2 (`"eip155:8453"`) and legacy short forms (`"base"`,
 *   `"base-sepolia"`, etc.) are recognized.
 * - **Solana**: Addresses and SPL mints are case-sensitive and passed through
 *   as-is.
 * - **Other chains**: Passed through unchanged.
 *
 * @packageDocumentation
 */
import { getEvmChainIdV1 } from "@x402/evm/v1";
import type { Network } from "@x402/core/types";

import type { Address, Asset } from "./types.js";
import { SpendControlError } from "./types.js";

/**
 * Maps legacy Solana network strings to their CAIP-2 equivalents.
 * EVM aliases are handled by `@x402/evm/v1`.
 */
const LEGACY_SVM_NETWORK_TO_CAIP: Record<string, Network> = {
  solana: "solana:mainnet",
  "solana-devnet": "solana:devnet",
  "solana-testnet": "solana:testnet",
};

/**
 * CDP SDK network aliases that are not part of the x402 foundation v1 EVM map.
 */
const CDP_EVM_NETWORK_CHAIN_ID_OVERRIDES: Record<string, number> = {
  "ethereum-sepolia": 11155111,
  optimism: 10,
  zora: 7777777,
  bnb: 56,
};

const CAIP_PATTERN = /^[a-z0-9-]+:[a-zA-Z0-9-_]+$/;

function getLegacyEvmChainId(network: string): number | undefined {
  const cdpOverride = CDP_EVM_NETWORK_CHAIN_ID_OVERRIDES[network];
  if (cdpOverride !== undefined) return cdpOverride;
  try {
    return getEvmChainIdV1(network);
  } catch {
    return undefined;
  }
}

/**
 * Returns `true` when the network identifier (CAIP or legacy) targets an EVM chain.
 */
function isEvmNetwork(network: string): boolean {
  if (network.startsWith("eip155:")) return true;
  return getLegacyEvmChainId(network) !== undefined;
}

/**
 * Returns `true` when the network identifier targets a Solana cluster.
 */
function isSvmNetwork(network: string): boolean {
  if (network.startsWith("solana:")) return true;
  const canonical = LEGACY_SVM_NETWORK_TO_CAIP[network];
  return typeof canonical === "string" && canonical.startsWith("solana:");
}

/**
 * Converts a network identifier to its canonical CAIP-2 form.
 *
 * Accepts CAIP-2 strings (`"eip155:8453"`) and legacy short forms
 * (`"base"`, `"base-sepolia"`, `"solana-devnet"`, …). Unknown but
 * CAIP-shaped strings are returned as-is.
 *
 * @throws {SpendControlError} `"network_not_allowed"` if the input is not
 *   a recognized short form or a valid CAIP-2 string.
 */
export function normalizeNetwork(network: string): Network {
  const svmCanonical = LEGACY_SVM_NETWORK_TO_CAIP[network];
  if (svmCanonical) return svmCanonical;
  const evmChainId = getLegacyEvmChainId(network);
  if (evmChainId !== undefined) return `eip155:${evmChainId}`;
  if (CAIP_PATTERN.test(network)) {
    return network as Network;
  }
  throw new SpendControlError(
    "network_not_allowed",
    `Network ${JSON.stringify(network)} is not a recognized CAIP-2 string or legacy v1 short form`,
    { network },
  );
}

/**
 * Normalizes a payee address for allow-list comparisons.
 *
 * - EVM addresses are lower-cased (checksumming is ignored).
 * - Solana addresses are returned unchanged (case-sensitive).
 * - Whitespace is trimmed on both sides.
 */
export function normalizePayee(network: string, payee: Address): Address {
  const trimmed = payee.trim();
  if (isEvmNetwork(network)) {
    return trimmed.toLowerCase();
  }
  if (isSvmNetwork(network)) {
    return trimmed;
  }
  // Unknown chain — pass through unchanged.
  return trimmed;
}

/**
 * Normalizes an asset identifier for allow-list comparisons.
 *
 * EVM contract addresses (`0x` + 40 hex chars) are lower-cased. Everything
 * else (Solana mints, symbolic names) is returned unchanged.
 */
export function normalizeAsset(asset: Asset): Asset {
  const trimmed = asset.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}
