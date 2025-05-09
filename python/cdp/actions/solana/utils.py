from enum import Enum

from solana.rpc.api import Client as SolanaClient


class Network(Enum):
    """The network to use for the transfer."""

    DEVNET = "devnet"
    MAINNET = "mainnet"
    TESTNET = "testnet"


def get_or_create_connection(network_or_connection: Network | SolanaClient) -> SolanaClient:
    """Get or create a Solana client.

    Args:
        network_or_connection: The network or connection to use

    Returns:
        The Solana client

    """
    if isinstance(network_or_connection, SolanaClient):
        return network_or_connection

    return SolanaClient(
        "https://api.mainnet-beta.solana.com"
        if network_or_connection.value == Network.MAINNET.value
        else "https://api.devnet.solana.com"
        if network_or_connection.value == Network.DEVNET.value
        else "https://api.testnet.solana.com"
    )


async def get_connected_network(connection: SolanaClient) -> Network:
    """Get the network from the connection.

    Args:
        connection: The connection to use

    Returns:
        The network

    """
    genesis_hash = await connection.get_genesis_hash()

    if genesis_hash == GENESIS_HASH_MAINNET:
        return "mainnet"
    elif genesis_hash == GENESIS_HASH_DEVNET:
        return "devnet"
    elif genesis_hash == GENESIS_HASH_TESTNET:
        return "testnet"

    raise ValueError("Unknown network")


GENESIS_HASH_MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
GENESIS_HASH_DEVNET = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
GENESIS_HASH_TESTNET = "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY"
