import { Connection } from "@solana/web3.js";

import {
  GENESIS_HASH_MAINNET,
  GENESIS_HASH_DEVNET,
  USDC_MAINNET_MINT_ADDRESS,
  USDC_DEVNET_MINT_ADDRESS,
} from "./constants.js";

export type Network = "mainnet" | "devnet";

type GetOrCreateConnectionOptions = {
  networkOrConnection: Network | Connection;
};

/**
 * Get a connection for the Solana network
 *
 * @param options - The options for the connection
 *
 * @param options.networkOrConnection - The network to use or a connection
 *
 * @returns The connection
 */
export function getOrCreateConnection({
  networkOrConnection,
}: GetOrCreateConnectionOptions): Connection {
  if (typeof networkOrConnection !== "string") {
    return networkOrConnection;
  }

  return new Connection(
    networkOrConnection === "mainnet"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com",
  );
}

/**
 * Legacy function for compatibility during migration
 *
 * @param connection - The Solana Connection instance
 * @returns The network type (mainnet or devnet)
 */
export async function getConnectedNetwork(connection: Connection): Promise<Network> {
  const genesisHash = await connection.getGenesisHash();

  if (genesisHash === GENESIS_HASH_MAINNET) {
    return "mainnet";
  } else if (genesisHash === GENESIS_HASH_DEVNET) {
    return "devnet";
  }

  throw new Error("Unknown or unsupported network");
}

/**
 * Get the USDC mint address for the given connection
 *
 * @param network - The network to use
 *
 * @returns The USDC mint address
 */
export function getUsdcMintAddress(network: Network): string {
  if (network === "mainnet") {
    return USDC_MAINNET_MINT_ADDRESS;
  }
  return USDC_DEVNET_MINT_ADDRESS;
}
