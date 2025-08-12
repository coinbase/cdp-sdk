from enum import Enum

from solana.rpc.api import Client as SolanaClient

from cdp.actions.solana.constants import (
    GENESIS_HASH_DEVNET,
    GENESIS_HASH_MAINNET,
    USDC_DEVNET_MINT_ADDRESS,
    USDC_MAINNET_MINT_ADDRESS,
)


class Network(Enum):
    """The network to use for the transfer."""

    DEVNET = "devnet"
    MAINNET = "mainnet"


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
    )


async def get_connected_network(connection: SolanaClient) -> Network:
    """Get the network from the connection.

    Args:
        connection: The connection to use

    Returns:
        The network

    """
    genesis_hash_resp = connection.get_genesis_hash()
    genesis_hash = str(genesis_hash_resp.value)

    if genesis_hash == GENESIS_HASH_MAINNET:
        return "mainnet"
    elif genesis_hash == GENESIS_HASH_DEVNET:
        return "devnet"

    raise ValueError("Unknown or unsupported network")


def get_usdc_mint_address(network: Network) -> str:
    """Get the USDC mint address for the given connection."""
    if network == Network.MAINNET:
        return USDC_MAINNET_MINT_ADDRESS
    return USDC_DEVNET_MINT_ADDRESS
