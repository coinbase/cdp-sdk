import { Connection } from "@solana/web3.js";

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

const GENESIS_HASH_MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const GENESIS_HASH_DEVNET = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const GENESIS_HASH_TESTNET = "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY";
