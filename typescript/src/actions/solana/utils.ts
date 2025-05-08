import { Connection } from "@solana/web3.js";

import {
  GENESIS_HASH_MAINNET,
  GENESIS_HASH_TESTNET,
  GENESIS_HASH_DEVNET,
  USDC_MAINNET_MINT_ADDRESS,
  USDC_DEVNET_MINT_ADDRESS,
} from "./constants.js";

export type Network = "mainnet" | "devnet" | "testnet";

type GetOrCreateConnectionOptions = {
  networkOrConnection: Network | Connection;
};

/**
 * Get a connection to the Solana network
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
      : networkOrConnection === "devnet"
        ? "https://api.devnet.solana.com"
        : "https://api.testnet.solana.com",
  );
}

/**
 * Get the network of the connected Solana node
 *
 * @param connection - The connection to the Solana network
 * @throws {Error} If the network is not mainnet, devnet, or testnet
 *
 * @returns The network of the connected Solana node
 */
export async function getConnectedNetwork(connection: Connection): Promise<Network> {
  const genesisHash = await connection.getGenesisHash();

  if (genesisHash === GENESIS_HASH_MAINNET) {
    return "mainnet";
  } else if (genesisHash === GENESIS_HASH_DEVNET) {
    return "devnet";
  } else if (genesisHash === GENESIS_HASH_TESTNET) {
    return "testnet";
  }

  throw new Error("Unknown network");
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
  } else if (network === "devnet") {
    return USDC_DEVNET_MINT_ADDRESS;
  } else {
    throw new Error("Testnet is not supported for USDC");
  }
}
