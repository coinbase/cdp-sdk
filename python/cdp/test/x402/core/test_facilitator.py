from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from cdp.x402.core.constants import SDK_CORRELATION_CONTEXT
from cdp.x402.core.facilitator import (
    create_cdp_facilitator_client,
    create_cdp_facilitator_client_sync,
)


def _mock_authenticated_inner_headers() -> dict[str, dict[str, str]]:
    """Mirror the shape returned by the CDP SDK ``create_headers`` callable
    when API key credentials are present.
    """
    return {
        "verify": {
            "Authorization": "Bearer jwt-verify",
            "Content-Type": "application/json",
            "Correlation-Context": "sdk_language=python,source=x402,source_version=2.0.0",
        },
        "settle": {
            "Authorization": "Bearer jwt-settle",
            "Content-Type": "application/json",
            "Correlation-Context": "sdk_language=python,source=x402,source_version=2.0.0",
        },
        "supported": {
            "Authorization": "Bearer jwt-supported",
            "Content-Type": "application/json",
            "Correlation-Context": "sdk_language=python,source=x402,source_version=2.0.0",
        },
        "list": {
            "Correlation-Context": "sdk_language=python,source=x402,source_version=2.0.0",
        },
    }


def _patch_authenticated_sdk_config() -> Any:
    """Return a patch that swaps ``create_facilitator_config`` for one that
    returns a config containing an authenticated ``create_headers`` callable.
    """
    return patch(
        "cdp.x402.core.facilitator.create_facilitator_config",
        return_value={
            "url": "https://api.cdp.coinbase.com/platform/v2/x402",
            "create_headers": _mock_authenticated_inner_headers,
        },
    )


def test_create_cdp_facilitator_client_uses_sdk_config() -> None:
    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return "client"

    with (
        _patch_authenticated_sdk_config() as create_config,
        patch(
            "cdp.x402.core.facilitator.HTTPFacilitatorClient",
            side_effect=_capture_client,
        ),
    ):
        result = create_cdp_facilitator_client("id", "secret")

    create_config.assert_called_once_with("id", "secret")
    assert result == "client"
    assert captured["config"]["url"] == "https://api.cdp.coinbase.com/platform/v2/x402"


def test_create_cdp_facilitator_client_sync_uses_sdk_config() -> None:
    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return "client-sync"

    with (
        _patch_authenticated_sdk_config() as create_config,
        patch(
            "cdp.x402.core.facilitator.HTTPFacilitatorClientSync",
            side_effect=_capture_client,
        ),
    ):
        result = create_cdp_facilitator_client_sync("id", "secret")

    create_config.assert_called_once_with("id", "secret")
    assert result == "client-sync"


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp.x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp.x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_cdp_server_api_key_vars_preferred_over_generic(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """CDP_SERVER_API_KEY_* should be chosen over CDP_API_KEY_* when both are set."""
    monkeypatch.setenv("CDP_SERVER_API_KEY_ID", "server-id")
    monkeypatch.setenv("CDP_SERVER_API_KEY_SECRET", "server-secret")
    monkeypatch.setenv("CDP_API_KEY_ID", "generic-id")
    monkeypatch.setenv("CDP_API_KEY_SECRET", "generic-secret")

    with (
        _patch_authenticated_sdk_config() as create_config,
        patch(cls, return_value=object()),
    ):
        factory()

    create_config.assert_called_once_with("server-id", "server-secret")


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp.x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp.x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_generic_api_key_vars_used_when_server_vars_absent(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """CDP_API_KEY_* should be used when CDP_SERVER_API_KEY_* are not set."""
    monkeypatch.delenv("CDP_SERVER_API_KEY_ID", raising=False)
    monkeypatch.delenv("CDP_SERVER_API_KEY_SECRET", raising=False)

    with (
        _patch_authenticated_sdk_config() as create_config,
        patch(cls, return_value=object()),
    ):
        factory(api_key_id=None, api_key_secret=None)

    create_config.assert_called_once_with(None, None)


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp.x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp.x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_explicit_args_override_env_vars(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """Explicit args always take precedence over any env var."""
    monkeypatch.setenv("CDP_SERVER_API_KEY_ID", "server-id")
    monkeypatch.setenv("CDP_SERVER_API_KEY_SECRET", "server-secret")

    with (
        _patch_authenticated_sdk_config() as create_config,
        patch(cls, return_value=object()),
    ):
        factory(api_key_id="explicit-id", api_key_secret="explicit-secret")

    create_config.assert_called_once_with("explicit-id", "explicit-secret")


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp.x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp.x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_correlation_context_overridden_on_every_endpoint(
    factory: Any,
    cls: str,
) -> None:
    """Every endpoint's headers must carry the cdp-x402 Correlation-Context,
    overriding whatever the underlying CDP SDK ``create_headers`` callable
    produced. The Authorization headers must be left untouched.
    """
    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return MagicMock()

    with (
        _patch_authenticated_sdk_config(),
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

    for endpoint in ("verify", "settle", "supported"):
        assert headers[endpoint]["Authorization"].startswith("Bearer ")


@pytest.mark.parametrize(
    "factory,cls",
    [
        (create_cdp_facilitator_client, "cdp.x402.core.facilitator.HTTPFacilitatorClient"),
        (create_cdp_facilitator_client_sync, "cdp.x402.core.facilitator.HTTPFacilitatorClientSync"),
    ],
)
def test_correlation_context_attached_even_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
    factory: Any,
    cls: str,
) -> None:
    """When credentials are missing the CDP SDK returns a config that may
    omit ``create_headers``; we must still attach a Correlation-Context to
    every endpoint so the request is identifiable as cdp-x402 traffic.
    """
    monkeypatch.delenv("CDP_SERVER_API_KEY_ID", raising=False)
    monkeypatch.delenv("CDP_SERVER_API_KEY_SECRET", raising=False)
    monkeypatch.delenv("CDP_API_KEY_ID", raising=False)
    monkeypatch.delenv("CDP_API_KEY_SECRET", raising=False)

    captured: dict[str, Any] = {}

    def _capture_client(config: dict[str, Any]) -> object:
        captured["config"] = config
        return MagicMock()

    unauth_config = {"url": "https://api.cdp.coinbase.com/platform/v2/x402"}

    with (
        patch(
            "cdp.x402.core.facilitator.create_facilitator_config",
            return_value=unauth_config,
        ),
        patch(cls, side_effect=_capture_client),
    ):
        factory()

    config = captured["config"]
    headers = config["create_headers"]()
    for endpoint in ("verify", "settle", "supported", "list"):
        assert headers[endpoint]["Correlation-Context"] == SDK_CORRELATION_CONTEXT
