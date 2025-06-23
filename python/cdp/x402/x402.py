import os
from collections.abc import Callable
from typing import TypedDict

from cdp.auth.utils.http import GetAuthHeadersOptions, get_auth_headers

COINBASE_FACILITATOR_BASE_URL = "https://api.cdp.coinbase.com"
COINBASE_FACILITATOR_V2_ROUTE = "/platform/v2/x402"

X402_VERSION = "0.4.0"


class FacilitatorConfig(TypedDict, total=False):
    """Configuration for the X402 facilitator service.

    Attributes:
        url: The base URL for the facilitator service
        create_headers: Optional function to create authentication headers

    """

    url: str
    create_headers: Callable[[], dict[str, dict[str, str]]]


def create_cdp_auth_headers(
    api_key_id: str | None = None, api_key_secret: str | None = None
) -> Callable[[], dict[str, dict[str, str]]]:
    """Create a CDP auth header for the facilitator service.

    Args:
        api_key_id: The CDP API key ID
        api_key_secret: The CDP API key secret

    Returns:
        A function that returns the auth headers

    """
    request_host = COINBASE_FACILITATOR_BASE_URL.replace("https://", "")

    async def _create_headers() -> dict[str, dict[str, str]]:
        # Use provided values or fall back to environment variables
        final_api_key_id = api_key_id or os.getenv("CDP_API_KEY_ID")
        final_api_key_secret = api_key_secret or os.getenv("CDP_API_KEY_SECRET")

        if not final_api_key_id or not final_api_key_secret:
            raise ValueError(
                "Missing API credentials: CDP_API_KEY_ID and CDP_API_KEY_SECRET must be provided or set as environment variables"
            )

        verify_auth_headers = get_auth_headers(
            GetAuthHeadersOptions(
                api_key_id=final_api_key_id,
                api_key_secret=final_api_key_secret,
                request_host=request_host,
                request_path=f"{COINBASE_FACILITATOR_V2_ROUTE}/verify",
                request_method="POST",
                source="x402",
                source_version=X402_VERSION,
            )
        )

        settle_auth_headers = get_auth_headers(
            GetAuthHeadersOptions(
                api_key_id=final_api_key_id,
                api_key_secret=final_api_key_secret,
                request_host=request_host,
                request_path=f"{COINBASE_FACILITATOR_V2_ROUTE}/settle",
                request_method="POST",
                source="x402",
                source_version=X402_VERSION,
            )
        )

        return {
            "verify": verify_auth_headers,
            "settle": settle_auth_headers,
        }

    return _create_headers


def create_facilitator_config(
    api_key_id: str | None = None, api_key_secret: str | None = None
) -> FacilitatorConfig:
    """Create a facilitator config for the Coinbase X402 facilitator.

    Args:
        api_key_id: The CDP API key ID
        api_key_secret: The CDP API key secret

    Returns:
        A facilitator config

    """
    return FacilitatorConfig(
        url=f"{COINBASE_FACILITATOR_BASE_URL}{COINBASE_FACILITATOR_V2_ROUTE}",
        create_headers=create_cdp_auth_headers(api_key_id, api_key_secret),
    )


# Default facilitator instance
facilitator = create_facilitator_config()
