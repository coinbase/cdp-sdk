"""
CDP-authenticated x402 facilitator client wrappers.

These helpers delegate facilitator configuration to the CDP SDK's
`create_facilitator_config` function, then wrap the resulting
``create_headers`` callable so every outgoing request carries a
``Correlation-Context`` header identifying the CDP x402 SDK (language and
version), and finally construct the corresponding x402 HTTP facilitator
client.
"""

import os
from collections.abc import Callable
from typing import Any

from cdp.x402.x402 import create_facilitator_config
from x402.http import HTTPFacilitatorClient, HTTPFacilitatorClientSync

from cdp.x402.core.constants import SDK_CORRELATION_CONTEXT

_HeaderMap = dict[str, str]
_CreateHeadersFn = Callable[[], dict[str, _HeaderMap]]


def _resolve_facilitator_credentials(
    api_key_id: str | None,
    api_key_secret: str | None,
) -> tuple[str | None, str | None]:
    """Resolve facilitator credentials preferring server-scoped env vars.

    Resolution order for each credential:
    1. Explicit argument value
    2. ``CDP_SERVER_API_KEY_ID`` / ``CDP_SERVER_API_KEY_SECRET`` env var
    3. Generic ``CDP_API_KEY_ID`` / ``CDP_API_KEY_SECRET`` env var (handled
       downstream by ``create_facilitator_config``)
    """
    resolved_id = api_key_id or os.environ.get("CDP_SERVER_API_KEY_ID")
    resolved_secret = api_key_secret or os.environ.get("CDP_SERVER_API_KEY_SECRET")
    return resolved_id, resolved_secret


def _with_cdp_x402_correlation(create_headers: _CreateHeadersFn) -> _CreateHeadersFn:
    """Wrap a ``create_headers`` callable so every endpoint header map carries
    the cdp-x402 SDK ``Correlation-Context``.

    The CDP SDK's default ``create_headers`` emits a Correlation-Context that
    identifies the underlying x402 library; we override it so requests are
    attributed to the cdp-x402 SDK and include this SDK's language / version.
    """

    def _wrapped() -> dict[str, _HeaderMap]:
        headers = create_headers()
        for endpoint_headers in headers.values():
            endpoint_headers["Correlation-Context"] = SDK_CORRELATION_CONTEXT
        return headers

    return _wrapped


def _build_cdp_facilitator_config(
    api_key_id: str | None, api_key_secret: str | None
) -> dict[str, Any]:
    """Build a facilitator config whose every request carries the cdp-x402
    Correlation-Context header.

    Always overrides ``create_headers`` even when the CDP SDK returned the
    unauthenticated variant — the Bazaar / list endpoint still needs an
    identifying Correlation-Context.
    """
    resolved_id, resolved_secret = _resolve_facilitator_credentials(api_key_id, api_key_secret)
    config = dict(create_facilitator_config(resolved_id, resolved_secret))
    inner = config.get("create_headers")
    if inner is None:
        config["create_headers"] = lambda: {
            "verify": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
            "settle": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
            "supported": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
            "list": {"Correlation-Context": SDK_CORRELATION_CONTEXT},
        }
    else:
        config["create_headers"] = _with_cdp_x402_correlation(inner)
    return config


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
