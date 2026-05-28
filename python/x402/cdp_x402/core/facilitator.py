"""
CDP-authenticated x402 facilitator client wrappers.

Builds a CDP-JWT-authenticated x402 facilitator config directly using
``cdp.auth.utils.http``, wrapping every outgoing request with a
``Correlation-Context`` header that identifies the CDP x402 SDK (language
and version).
"""

import os
from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse

from cdp.auth.utils.http import GetAuthHeadersOptions, get_auth_headers
from x402.http import HTTPFacilitatorClient, HTTPFacilitatorClientSync

from cdp_x402.core.constants import (
    CDP_API_HOST,
    CDP_FACILITATOR_URL,
    SDK_CORRELATION_CONTEXT,
)

_HeaderMap = dict[str, str]
_CreateHeadersFn = Callable[[], dict[str, _HeaderMap]]

# Paths used for per-endpoint JWT generation (relative to the API host).
_FACILITATOR_BASE_PATH = urlparse(CDP_FACILITATOR_URL).path  # e.g. /platform/v2/x402


def _resolve_facilitator_credentials(
    api_key_id: str | None,
    api_key_secret: str | None,
) -> tuple[str | None, str | None]:
    """Resolve facilitator credentials, preferring server-scoped env vars.

    Resolution order for each credential:
    1. Explicit argument value
    2. ``CDP_SERVER_API_KEY_ID`` / ``CDP_SERVER_API_KEY_SECRET`` env var
    3. ``CDP_API_KEY_ID`` / ``CDP_API_KEY_SECRET`` env var
    """
    resolved_id = (
        api_key_id
        or os.environ.get("CDP_SERVER_API_KEY_ID")
        or os.environ.get("CDP_API_KEY_ID")
    )
    resolved_secret = (
        api_key_secret
        or os.environ.get("CDP_SERVER_API_KEY_SECRET")
        or os.environ.get("CDP_API_KEY_SECRET")
    )
    return resolved_id, resolved_secret


def _make_endpoint_headers(
    api_key_id: str,
    api_key_secret: str,
    suffix: str,
    method: str = "POST",
) -> _HeaderMap:
    """Generate CDP JWT auth headers for a single facilitator endpoint."""
    headers = get_auth_headers(
        GetAuthHeadersOptions(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            request_host=CDP_API_HOST,
            request_path=f"{_FACILITATOR_BASE_PATH}{suffix}",
            request_method=method,
            source="x402",
            source_version="2.0.0",
        )
    )
    headers["Correlation-Context"] = SDK_CORRELATION_CONTEXT
    return headers


def _build_cdp_facilitator_config(
    api_key_id: str | None, api_key_secret: str | None
) -> dict[str, Any]:
    """Build a facilitator config whose every request carries the cdp-x402
    Correlation-Context header.

    Uses CDP JWT authentication when credentials are available, otherwise
    falls back to unauthenticated headers — the Bazaar / list endpoint only
    needs the identifying Correlation-Context either way.
    """
    resolved_id, resolved_secret = _resolve_facilitator_credentials(api_key_id, api_key_secret)

    if resolved_id and resolved_secret:

        def _create_headers() -> dict[str, _HeaderMap]:
            return {
                "verify": _make_endpoint_headers(resolved_id, resolved_secret, "/verify"),
                "settle": _make_endpoint_headers(resolved_id, resolved_secret, "/settle"),
                "supported": _make_endpoint_headers(
                    resolved_id, resolved_secret, "/supported", "GET"
                ),
                "list": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
            }

    else:

        def _create_headers() -> dict[str, _HeaderMap]:  # type: ignore[misc]
            return {
                "verify": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
                "settle": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
                "supported": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
                "list": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
            }

    return {"url": CDP_FACILITATOR_URL, "create_headers": _create_headers}


def create_cdp_facilitator_client(
    api_key_id: str | None = None, api_key_secret: str | None = None
) -> HTTPFacilitatorClient:
    """Create a CDP-authenticated async x402 facilitator client.

    This uses the CDP SDK `create_facilitator_config` helper, wraps its
    auth-headers callable so every request carries a ``Correlation-Context``
    identifying the CDP x402 SDK (language and version), and returns an
    `HTTPFacilitatorClient` ready for use with async resource servers.

    Credentials are resolved in order:
    1. Explicit ``api_key_id`` / ``api_key_secret`` arguments
    2. ``CDP_SERVER_API_KEY_ID`` / ``CDP_SERVER_API_KEY_SECRET`` env vars
    3. ``CDP_API_KEY_ID`` / ``CDP_API_KEY_SECRET`` env vars

    Args:
        api_key_id: CDP API key ID override.
        api_key_secret: CDP API key secret override.

    Returns:
        Configured async `HTTPFacilitatorClient`.
    """
    return HTTPFacilitatorClient(_build_cdp_facilitator_config(api_key_id, api_key_secret))


def create_cdp_facilitator_client_sync(
    api_key_id: str | None = None, api_key_secret: str | None = None
) -> HTTPFacilitatorClientSync:
    """Create a CDP-authenticated synchronous x402 facilitator client.

    This uses the CDP SDK `create_facilitator_config` helper, wraps its
    auth-headers callable so every request carries a ``Correlation-Context``
    identifying the CDP x402 SDK (language and version), and returns an
    `HTTPFacilitatorClientSync` ready for use with sync resource servers
    (e.g. Flask / WSGI).

    Credentials are resolved in order:
    1. Explicit ``api_key_id`` / ``api_key_secret`` arguments
    2. ``CDP_SERVER_API_KEY_ID`` / ``CDP_SERVER_API_KEY_SECRET`` env vars
    3. ``CDP_API_KEY_ID`` / ``CDP_API_KEY_SECRET`` env vars

    Args:
        api_key_id: CDP API key ID override.
        api_key_secret: CDP API key secret override.

    Returns:
        Configured sync `HTTPFacilitatorClientSync`.
    """
    return HTTPFacilitatorClientSync(_build_cdp_facilitator_config(api_key_id, api_key_secret))
