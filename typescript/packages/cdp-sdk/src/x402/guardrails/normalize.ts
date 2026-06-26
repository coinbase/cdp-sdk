/*
 * Normalization helpers used by the spend-control allow-lists.
 */

import { CDP_NETWORK_TO_CAIP2 } from "../constants.js";
import { SpendControlError } from "./types.js";

import type { Address, Asset } from "./types.js";
import type { Network } from "@x402/core/types";

const LEGACY_SVM_NETWORK_TO_CAIP: Record<string, Network> = {
  solana: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "solana-devnet": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  "solana-testnet": "solana:testnet",
};

const CAIP_PATTERN = /^[a-z0-9-]+:[a-zA-Z0-9-_]+$/;

const isEvmNetwork = (network: string): boolean => {
  if (network.startsWith("eip155:")) return true;
  return network in CDP_NETWORK_TO_CAIP2;
};

const isSvmNetwork = (network: string): boolean => {
  if (network.startsWith("solana:")) return true;
  return network in LEGACY_SVM_NETWORK_TO_CAIP;
};

/**
 * Converts a network identifier to its canonical CAIP-2 form.
 *
 * Accepts CAIP-2 strings (`"eip155:8453"`) and legacy short forms
 * (`"base"`, `"base-sepolia"`, `"solana-devnet"`, …).
 *
 * @param network - The network identifier to normalize.
 * @returns The canonical CAIP-2 network identifier.
 * @throws {SpendControlError} `"network_not_allowed"` if the input is not recognized.
 */
export function normalizeNetwork(network: string): Network {
  const svmCanonical = LEGACY_SVM_NETWORK_TO_CAIP[network];
  if (svmCanonical) return svmCanonical;
  const caip2 = CDP_NETWORK_TO_CAIP2[network];
  if (caip2) return caip2 as Network;
  if (CAIP_PATTERN.test(network)) {
    return network as Network;
  }
  throw new SpendControlError(
    "network_not_allowed",
    `Network ${JSON.stringify(network)} is not a recognized CAIP-2 string or legacy short form`,
    { network },
  );
}

/**
 * Normalizes a payee address for allow-list comparisons.
 *
 * EVM addresses are lower-cased; Solana addresses are returned unchanged.
 *
 * @param network - The network the payee is on.
 * @param payee - The payee address to normalize.
 * @returns The normalized payee address.
 */
export function normalizePayee(network: string, payee: Address): Address {
  const trimmed = payee.trim();
  if (isEvmNetwork(network)) {
    return trimmed.toLowerCase();
  }
  if (isSvmNetwork(network)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Normalizes an asset identifier for allow-list comparisons.
 *
 * EVM contract addresses (`0x` + 40 hex chars) are lower-cased. Everything
 * else (Solana mints, symbolic names) is returned unchanged.
 *
 * @param asset - The asset identifier to normalize.
 * @returns The normalized asset identifier.
 */
export function normalizeAsset(asset: Asset): Asset {
  const trimmed = asset.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}
