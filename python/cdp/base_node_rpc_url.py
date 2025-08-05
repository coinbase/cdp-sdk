"""Base Node RPC URL functionality for CDP SDK."""

from typing import Literal
from urllib.parse import urlparse

import aiohttp

from cdp.api_clients import ApiClients
from cdp.auth.utils.jwt import JwtOptions, generate_jwt


async def get_base_node_rpc_url(
    api_clients: ApiClients,
    network: Literal["base", "base-sepolia"],
) -> str | None:
    """Get the base node RPC URL for a given network. Can also be used as a Paymaster URL.

    Args:
        api_clients: The API clients object containing CDP client configuration
        network: The network identifier

    Returns:
        The base node RPC URL or None if the network is not supported or if there's an error

    """
    try:
        # Get the CDP API client configuration
        cdp_client = api_clients._cdp_client

        # Extract base path and remove /platform suffix if present
        base_path = cdp_client.configuration.host
        if base_path.endswith("/platform"):
            base_path = base_path[:-9]  # Remove "/platform"

        # Parse the base path to get the host for JWT generation
        parsed_url = urlparse(base_path)
        request_host = parsed_url.netloc

        # Generate JWT for authentication
        jwt_options = JwtOptions(
            api_key_id=cdp_client.api_key_id,
            api_key_secret=cdp_client.api_key_secret,
            request_method="GET",
            request_host=request_host,
            request_path="/apikeys/v1/tokens/active",
        )

        jwt_token = generate_jwt(jwt_options)

        # Make request to get active token
        async with (
            aiohttp.ClientSession() as session,
            session.get(
                f"{base_path}/apikeys/v1/tokens/active",
                headers={
                    "Authorization": f"Bearer {jwt_token}",
                    "Content-Type": "application/json",
                },
            ) as response,
        ):
            if response.status == 200:
                json_data = await response.json()
                token_id = json_data.get("id")
                if token_id:
                    return f"{base_path}/rpc/v1/{network}/{token_id}"

        return None

    except Exception:
        return None
