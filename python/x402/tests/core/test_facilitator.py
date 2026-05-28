from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from cdp_x402.core.constants import CDP_FACILITATOR_URL, SDK_CORRELATION_CONTEXT
from cdp_x402.core.facilitator import (
    create_cdp_facilitator_client,
    create_cdp_facilitator_client_sync,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FAKE_AUTH_HEADERS = {
    "Authorization": "Bearer jwt-token",
    "Content-Type": "application/json",
    "Correlation-Context": "sdk_language=python,source=x402,source_version=2.0.0",
}


def _patch_get_auth_headers():
    return patch(
        "cdp_x402.core.facilitator.get_auth_headers",
        return_value=dict(_FAKE_AUTH_HEADERS),
    )


# ---------------------------------------------------------------------------
# Basic construction tests
# ---------------------------------------------------------------------------


def test_create_cdp_facilitator_client_returns_client() -> None:
    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return "client"

    with (
        _patch_get_auth_headers(),
        patch("cdp_x402.core.facilitator.HTTPFacilitatorClient", side_effect=_capture_client),
    ):
        result = create_cdp_facilitator_client("id", "secret")
        assert result == "client"
        assert captured["config"]["url"] == CDP_FACILITATOR_URL
        assert callable(captured["config"]["create_headers"])


def test_create_cdp_facilitator_client_sync_returns_client() -> None:
    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return "client-sync"

    with (
        _patch_get_auth_headers(),
        patch(
            "cdp_x402.core.facilitator.HTTPFacilitatorClientSync",
            side_effect=_capture_client,
        ),
    ):
        result = create_cdp_facilitator_client_sync("id", "secret")

    assert result == "client-sync"


# ---------------------------------------------------------------------------
# Credential resolution tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp_x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp_x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_cdp_server_api_key_vars_preferred_over_generic(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """CDP_SERVER_API_KEY_* must be chosen over CDP_API_KEY_* when both are set."""
    monkeypatch.setenv("CDP_SERVER_API_KEY_ID", "server-id")
    monkeypatch.setenv("CDP_SERVER_API_KEY_SECRET", "server-secret")
    monkeypatch.setenv("CDP_API_KEY_ID", "generic-id")
    monkeypatch.setenv("CDP_API_KEY_SECRET", "generic-secret")

    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return MagicMock()

    with (
        _patch_get_auth_headers() as mock_get_auth,
        patch(cls, side_effect=_capture_client),
    ):
        factory()

    # All get_auth_headers calls must use the server-scoped credentials.
    for c in mock_get_auth.call_args_list:
        opts = c.args[0]
        assert opts.api_key_id == "server-id"
        assert opts.api_key_secret == "server-secret"


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp_x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp_x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_generic_api_key_vars_used_when_server_vars_absent(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """CDP_API_KEY_* must be used when CDP_SERVER_API_KEY_* are not set."""
    monkeypatch.delenv("CDP_SERVER_API_KEY_ID", raising=False)
    monkeypatch.delenv("CDP_SERVER_API_KEY_SECRET", raising=False)
    monkeypatch.setenv("CDP_API_KEY_ID", "generic-id")
    monkeypatch.setenv("CDP_API_KEY_SECRET", "generic-secret")

    with (
        _patch_get_auth_headers() as mock_get_auth,
        patch(cls, return_value=MagicMock()),
    ):
        factory(api_key_id=None, api_key_secret=None)

    for c in mock_get_auth.call_args_list:
        opts = c.args[0]
        assert opts.api_key_id == "generic-id"
        assert opts.api_key_secret == "generic-secret"


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp_x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp_x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_explicit_args_override_env_vars(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """Explicit args must always take precedence over any env var."""
    monkeypatch.setenv("CDP_SERVER_API_KEY_ID", "server-id")
    monkeypatch.setenv("CDP_SERVER_API_KEY_SECRET", "server-secret")

    with (
        _patch_get_auth_headers() as mock_get_auth,
        patch(cls, return_value=MagicMock()),
    ):
        factory(api_key_id="explicit-id", api_key_secret="explicit-secret")

    for c in mock_get_auth.call_args_list:
        opts = c.args[0]
        assert opts.api_key_id == "explicit-id"
        assert opts.api_key_secret == "explicit-secret"


# ---------------------------------------------------------------------------
# Correlation-Context tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp_x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp_x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_correlation_context_overridden_on_every_endpoint(
    factory: Any,
    cls: str,
) -> None:
    """Every endpoint must carry the cdp-x402 Correlation-Context, overriding
    whatever the underlying ``get_auth_headers`` returned.
    Authorization headers must be left untouched.
    """
    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return MagicMock()

    with (
        _patch_get_auth_headers(),
        patch(cls, side_effect=_capture_client),
    ):
        factory("id", "secret")
        config = captured["config"]
        assert callable(config["create_headers"])
        headers = config["create_headers"]()

    for endpoint in ("verify", "settle", "supported", "list"):
        assert headers[endpoint]["Correlation-Context"] == SDK_CORRELATION_CONTEXT, (
            f"{endpoint} Correlation-Context not overridden"
        )
        assert "source=cdp-x402" in headers[endpoint]["Correlation-Context"]
        assert "sdkLanguage=python" in headers[endpoint]["Correlation-Context"]

    # Authorization headers must remain intact on authenticated endpoints.
    for endpoint in ("verify", "settle", "supported"):
        assert headers[endpoint]["Authorization"].startswith("Bearer ")


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp_x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp_x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_correlation_context_attached_even_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """Without credentials the unauthenticated path must still attach
    a Correlation-Context to every endpoint so traffic is identifiable
    as cdp-x402.
    """
    monkeypatch.delenv("CDP_SERVER_API_KEY_ID", raising=False)
    monkeypatch.delenv("CDP_SERVER_API_KEY_SECRET", raising=False)
    monkeypatch.delenv("CDP_API_KEY_ID", raising=False)
    monkeypatch.delenv("CDP_API_KEY_SECRET", raising=False)

    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return MagicMock()

    with patch(cls, side_effect=_capture_client):
        factory()

    config = captured["config"]
    headers = config["create_headers"]()
    for endpoint in ("verify", "settle", "supported", "list"):
        assert headers[endpoint]["Correlation-Context"] == SDK_CORRELATION_CONTEXT


# ---------------------------------------------------------------------------
# Endpoint path + method tests
# ---------------------------------------------------------------------------


def test_authenticated_headers_use_correct_paths_and_methods() -> None:
    """JWT must be generated with the correct per-endpoint paths and HTTP methods."""
    from cdp_x402.core.facilitator import _FACILITATOR_BASE_PATH

    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return MagicMock()

    with (
        _patch_get_auth_headers() as mock_get_auth,
        patch(
            "cdp_x402.core.facilitator.HTTPFacilitatorClient",
            side_effect=_capture_client,
        ),
    ):
        create_cdp_facilitator_client("id", "secret")
        # Trigger header creation inside the patch context.
        captured["config"]["create_headers"]()

    calls = {c.args[0].request_path: c.args[0].request_method for c in mock_get_auth.call_args_list}
    assert calls[f"{_FACILITATOR_BASE_PATH}/verify"] == "POST"
    assert calls[f"{_FACILITATOR_BASE_PATH}/settle"] == "POST"
    assert calls[f"{_FACILITATOR_BASE_PATH}/supported"] == "GET"
