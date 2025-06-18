import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
  type PublicClient,
  type WalletClient,
} from "viem";
import * as chains from "viem/chains";

/**
 * Network identifier to viem chain mapping
 */
const NETWORK_TO_CHAIN_MAP: Record<string, Chain> = {
  base: chains.base,
  "base-sepolia": chains.baseSepolia,
  mainnet: chains.mainnet,
  ethereum: chains.mainnet,
  sepolia: chains.sepolia,
  eth: chains.mainnet,
};

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
  return Object.prototype.hasOwnProperty.call(NETWORK_TO_CHAIN_MAP, normalizedInput);
}

/**
 * Resolves a network identifier to a viem chain
 *
 * @param network - The network identifier to resolve
 * @returns The resolved viem chain
 */
function resolveNetworkToChain(network: string): Chain {
  const chain = NETWORK_TO_CHAIN_MAP[network.toLowerCase()];
  if (!chain) {
    throw new Error(`Unsupported network identifier: ${network}`);
  }
  return chain;
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
    throw new Error(`Invalid URL format: ${nodeUrl}`);
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
  account: Address;
};

/**
 * Result of resolving viem clients
 */
export type ResolvedViemClients = {
  /** The resolved viem chain */
  chain: Chain;
  /** The public client for reading blockchain data */
  publicClient: PublicClient;
  /** The wallet client for sending transactions */
  walletClient: WalletClient;
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
  const { networkOrNodeUrl, account } = options;

  let chain: Chain;

  // If it's a valid network identifier, use the mapping
  if (isNetworkIdentifier(networkOrNodeUrl)) {
    chain = resolveNetworkToChain(networkOrNodeUrl);
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });
    const walletClient = createWalletClient({
      chain,
      transport: http(),
      account,
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
      chain,
      transport: http(networkOrNodeUrl),
      account,
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
    throw new Error(`Unsupported network identifier or invalid Node URL: ${networkOrNodeUrl}`);
  }
}
