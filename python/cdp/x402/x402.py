import os
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, TypedDict

from cdp.auth.utils.http import GetAuthHeadersOptions, _get_correlation_data, get_auth_headers

COINBASE_FACILITATOR_BASE_URL = "https://api.cdp.coinbase.com"
COINBASE_FACILITATOR_V2_ROUTE = "/platform/v2/x402"

X402_VERSION_V1 = "1.0.0"
X402_VERSION_V2 = "2.0.0"


# ============================================================================
# V1 Implementation
# ============================================================================


class FacilitatorConfig(TypedDict, total=False):
    """Configuration for the X402 facilitator service.

    Attributes:
        url: The base URL for the facilitator service
        create_headers: Optional function to create authentication headers

    """

    url: str
    create_headers: Callable[[], dict[str, dict[str, str]]]


def create_cdp_auth_headers(
    api_key_id: str, api_key_secret: str
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
        verify_auth_headers = get_auth_headers(
            GetAuthHeadersOptions(
                api_key_id=api_key_id,
                api_key_secret=api_key_secret,
                request_host=request_host,
                request_path=f"{COINBASE_FACILITATOR_V2_ROUTE}/verify",
                request_method="POST",
                source="x402",
                source_version=X402_VERSION_V1,
            )
        )

        settle_auth_headers = get_auth_headers(
            GetAuthHeadersOptions(
                api_key_id=api_key_id,
                api_key_secret=api_key_secret,
                request_host=request_host,
                request_path=f"{COINBASE_FACILITATOR_V2_ROUTE}/settle",
                request_method="POST",
                source="x402",
                source_version=X402_VERSION_V1,
            )
        )

        # List endpoint always uses only correlation headers, no JWT auth
        list_correlation_headers = {
            "Correlation-Context": _get_correlation_data(
                source="x402",
                source_version=X402_VERSION_V1,
            )
        }

        return {
            "verify": verify_auth_headers,
            "settle": settle_auth_headers,
            "list": list_correlation_headers,
        }

    return _create_headers


def create_cdp_unauth_headers() -> Callable[[], dict[str, dict[str, str]]]:
    """Create unauthenticated headers for the facilitator service.

    Returns:
        A function that returns the unauthenticated headers (only supports list operation)

    """

    async def _create_headers() -> dict[str, dict[str, str]]:
        # Create correlation headers for list endpoint (no authentication needed)
        correlation_headers = {
            "Correlation-Context": _get_correlation_data(
                source="x402",
                source_version=X402_VERSION_V1,
            )
        }

        return {
            "verify": {},
            "settle": {},
            "list": correlation_headers,
        }

    return _create_headers


def create_facilitator_config(
    api_key_id: str | None = None,
    api_key_secret: str | None = None,
) -> FacilitatorConfig:
    """Create a facilitator config for the Coinbase X402 facilitator.

    Args:
        api_key_id: The CDP API key ID
        api_key_secret: The CDP API key secret

    Returns:
        A facilitator config

    """
    final_api_key_id = api_key_id or os.getenv("CDP_API_KEY_ID")
    final_api_key_secret = api_key_secret or os.getenv("CDP_API_KEY_SECRET")

    if final_api_key_id and final_api_key_secret:
        return FacilitatorConfig(
            url=f"{COINBASE_FACILITATOR_BASE_URL}{COINBASE_FACILITATOR_V2_ROUTE}",
            create_headers=create_cdp_auth_headers(final_api_key_id, final_api_key_secret),
        )

    return FacilitatorConfig(
        url=f"{COINBASE_FACILITATOR_BASE_URL}{COINBASE_FACILITATOR_V2_ROUTE}",
        create_headers=create_cdp_unauth_headers(),
    )


# Default facilitator instance (V1)
facilitator = create_facilitator_config()


# ============================================================================
# V2 Implementation
# ============================================================================


@dataclass
class AuthHeaders:
    """Authentication headers for facilitator endpoints."""

    verify: dict[str, str] = field(default_factory=dict)
    settle: dict[str, str] = field(default_factory=dict)
    supported: dict[str, str] = field(default_factory=dict)


@dataclass
class FacilitatorConfigV2:
    """Configuration for HTTPFacilitatorClient."""

    url: str
    timeout: float = 30.0
    http_client: Any = None
    auth_provider: Any = None
    identifier: str | None = None


def _get_cdp_headers(
    api_key_id: str,
    api_key_secret: str,
    path: str,
    method: str,
    version: str,
) -> dict[str, str]:
    """Generate CDP auth headers for a specific endpoint."""
    request_host = COINBASE_FACILITATOR_BASE_URL.replace("https://", "")
    return get_auth_headers(
        GetAuthHeadersOptions(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            request_host=request_host,
            request_path=path,
            request_method=method,
            source="x402",
            source_version=version,
        )
    )


class CDPAuthProvider:
    """CDP authentication provider for HTTPFacilitatorClient."""

    def __init__(self, api_key_id: str, api_key_secret: str):
        self._api_key_id = api_key_id
        self._api_key_secret = api_key_secret
        self._version = X402_VERSION_V2

    def get_auth_headers(self) -> AuthHeaders:
        """Get authentication headers for each endpoint."""
        return AuthHeaders(
            verify=_get_cdp_headers(
                self._api_key_id,
                self._api_key_secret,
                f"{COINBASE_FACILITATOR_V2_ROUTE}/verify",
                "POST",
                self._version,
            ),
            settle=_get_cdp_headers(
                self._api_key_id,
                self._api_key_secret,
                f"{COINBASE_FACILITATOR_V2_ROUTE}/settle",
                "POST",
                self._version,
            ),
            supported=_get_cdp_headers(
                self._api_key_id,
                self._api_key_secret,
                f"{COINBASE_FACILITATOR_V2_ROUTE}/supported",
                "GET",
                self._version,
            ),
        )


def create_facilitator_config_v2(
    api_key_id: str | None = None,
    api_key_secret: str | None = None,
) -> FacilitatorConfigV2:
    """Create a facilitator config for HTTPFacilitatorClient.

    Args:
        api_key_id: The CDP API key ID
        api_key_secret: The CDP API key secret

    Returns:
        A FacilitatorConfigV2 for use with HTTPFacilitatorClient

    """
    final_api_key_id = api_key_id or os.getenv("CDP_API_KEY_ID")
    final_api_key_secret = api_key_secret or os.getenv("CDP_API_KEY_SECRET")

    url = f"{COINBASE_FACILITATOR_BASE_URL}{COINBASE_FACILITATOR_V2_ROUTE}"

    if final_api_key_id and final_api_key_secret:
        return FacilitatorConfigV2(
            url=url,
            auth_provider=CDPAuthProvider(final_api_key_id, final_api_key_secret),
        )

    return FacilitatorConfigV2(url=url)
