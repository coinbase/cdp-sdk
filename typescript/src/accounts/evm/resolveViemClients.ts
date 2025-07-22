import {
  Account,
  createPublicClient,
  createWalletClient,
  http,
  Transport,
  type Chain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { toAccount } from "viem/accounts";
import * as chains from "viem/chains";

import { getBaseNodeRpcUrl } from "./getBaseNodeRpcUrl.js";
import { NETWORK_TO_CHAIN_MAP, resolveNetworkToChain } from "./networkToChainResolver.js";
import { UserInputValidationError } from "../../errors.js";

import type { EvmAccount } from "./types.js";

/**
 * Get a chain from the viem chains object
 *
 * @param id - The chain ID
 * @returns The chain
 */
function getChain(id: number): Chain {
  const chainList = Object.values(chains) as Chain[];
  const found = chainList.find(chain => chain.id === id);
  if (!found) throw new Error(`Unsupported chain ID: ${id}`);
  return found;
}

/**
 * Determines if the input string is a network identifier or a Node URL
 *
 * @param input - The string to check
 * @returns True if the input is a network identifier, false otherwise
 */
function isNetworkIdentifier(input: string): boolean {
  const normalizedInput = input.toLowerCase();
  return NETWORK_TO_CHAIN_MAP[normalizedInput] !== undefined;
}

/**
 * Resolves a Node URL to a viem chain by making a getChainId call
 *
 * @param nodeUrl - The Node URL to resolve
 * @returns Promise resolving to the viem chain
 */
async function resolveNodeUrlToChain(nodeUrl: string): Promise<Chain> {
  // First validate that it's a proper URL
  if (!isValidUrl(nodeUrl)) {
    throw new UserInputValidationError(`Invalid URL format: ${nodeUrl}`);
  }

  // Create a temporary public client to get the chain ID
  const tempPublicClient = createPublicClient({
    transport: http(nodeUrl),
  });

  try {
    const chainId = await tempPublicClient.getChainId();
    const chain = getChain(Number(chainId));
    return chain;
  } catch (error) {
    throw new Error(
      `Failed to resolve chain ID from Node URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Determines if the input string is a valid URL
 *
 * @param input - The string to validate as a URL
 * @returns True if the input is a valid URL, false otherwise
 */
function isValidUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Options for resolving viem clients
 */
export type ResolveViemClientsOptions = {
  /** The network identifier (e.g., "base", "base-sepolia") or Node URL */
  networkOrNodeUrl: string;
  /** Optional account to use for the wallet client */
  account: EvmAccount;
};

/**
 * Result of resolving viem clients
 */
export type ResolvedViemClients = {
  /** The resolved viem chain */
  chain: Chain;
  /** The public client for reading blockchain data */
  publicClient: PublicClient<Transport, Chain>;
  /** The wallet client for sending transactions */
  walletClient: WalletClient<Transport, Chain, Account>;
};

/**
 * Resolves viem clients based on a network identifier or Node URL.
 *
 * @param options - Configuration options
 * @param options.networkOrNodeUrl - Either a network identifier (e.g., "base", "base-sepolia") or a full Node URL
 * @param options.account - Optional account to use for the wallet client
 * @returns Promise resolving to an object containing the chain, publicClient, and walletClient
 *
 * @example
 * ```typescript
 * // Using network identifier
 * const clients = await resolveViemClients({
 *   networkOrNodeUrl: "base",
 *   account: myAccount
 * });
 *
 * // Using Node URL
 * const clients = await resolveViemClients({
 *   networkOrNodeUrl: "https://mainnet.base.org",
 *   account: myAccount
 * });
 * ```
 */
export async function resolveViemClients(
  options: ResolveViemClientsOptions,
): Promise<ResolvedViemClients> {
  const { networkOrNodeUrl } = options;

  let chain: Chain;

  // If it's a valid network identifier, use the mapping
  if (isNetworkIdentifier(networkOrNodeUrl)) {
    const rpcUrl =
      networkOrNodeUrl === "base" || networkOrNodeUrl === "base-sepolia"
        ? await getBaseNodeRpcUrl(networkOrNodeUrl)
        : undefined;

    chain = resolveNetworkToChain(networkOrNodeUrl);
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account: toAccount(options.account),
      chain,
      transport: http(rpcUrl),
    });
    return {
      chain,
      publicClient,
      walletClient,
    };
  }

  // If it's not a valid network identifier, try to treat it as a Node URL
  try {
    chain = await resolveNodeUrlToChain(networkOrNodeUrl);
    const publicClient = createPublicClient({
      chain,
      transport: http(networkOrNodeUrl),
    });
    const walletClient = createWalletClient({
      account: toAccount(options.account),
      chain,
      transport: http(networkOrNodeUrl),
    });
    return {
      chain,
      publicClient,
      walletClient,
    };
  } catch (error) {
    // If the error is from resolveNodeUrlToChain, re-throw it as-is
    if (
      error instanceof Error &&
      (error.message.includes("Invalid URL format") ||
        error.message.includes("Unsupported chain ID") ||
        error.message.includes("Failed to resolve chain ID"))
    ) {
      throw error;
    }

    // Otherwise, throw a generic error about unsupported input
    throw new UserInputValidationError(
      `Unsupported network identifier or invalid Node URL: ${networkOrNodeUrl}`,
    );
  }
}
