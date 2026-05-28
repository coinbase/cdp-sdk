"""Unit tests for cdp_x402.core.resource_server.

Verifies parity with the TypeScript ``CdpResourceServer`` implementation.
"""

from __future__ import annotations

from contextlib import ExitStack
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from x402.http import PaymentOption, RouteConfig

from cdp_x402.core.extensions import (
    CDP_EXTENSION_BAZAAR,
    CDP_EXTENSION_GAS_SPONSORING_EIP2612,
    CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
    CDP_SUPPORTED_EXTENSIONS,
    build_bazaar_declaration,
    get_cdp_extension_registrations,
)
from cdp_x402.core.resource_server import (
    CDP_SERVER_DEFAULT_EVM_NETWORKS,
    CDP_SERVER_DEFAULT_NETWORKS,
    CDP_SERVER_DEFAULT_SVM_NETWORKS,
    CdpResourceServer,
    CdpResourceServerConfig,
    CdpRouteConfig,
    create_cdp_resource_server,
    get_cdp_default_schemes,
)
from cdp_x402.core.wallets.config import WalletConfig
from cdp_x402.core.wallets.provision import CdpAccountProvisionResult

MOCK_EVM_ADDRESS = "0xabcdef1234567890abcdef1234567890abcdef12"
MOCK_SVM_ADDRESS = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"

SIMPLE_ROUTES: dict[str, Any] = {
    "GET /report": CdpRouteConfig(price="$0.01", description="test route"),
}


def _make_provision_result(
    evm_address: str = MOCK_EVM_ADDRESS,
    svm_address: str = MOCK_SVM_ADDRESS,
    owner_wallet: str | None = None,
) -> CdpAccountProvisionResult:
    cdp_client_mock = MagicMock()
    cdp_client_mock.close = AsyncMock()
    return CdpAccountProvisionResult(
        cdp_client=cdp_client_mock,
        evm_address=evm_address,
        svm_address=svm_address,
        owner_wallet=owner_wallet,
    )


class _ResourceServerStub:
    """Minimal stand-in for ``x402ResourceServer`` to record register calls."""

    def __init__(self, *_args: Any, **_kwargs: Any) -> None:
        self.register_calls: list[tuple[str, Any]] = []
        self.register_extension_calls: list[Any] = []

    def register(self, network: str, server: Any) -> _ResourceServerStub:
        self.register_calls.append((network, server))
        return self

    def register_extension(self, extension: Any) -> _ResourceServerStub:
        self.register_extension_calls.append(extension)
        return self


def _patch_create_flow(
    *,
    provision_result: CdpAccountProvisionResult | None = None,
    provision_side_effect: Exception | None = None,
    initialize_side_effect: Exception | None = None,
) -> Any:
    """ExitStack-friendly patches for ``CdpResourceServer.create``."""
    provision_result = provision_result or _make_provision_result()

    facilitator_stub = MagicMock(name="facilitator-client")
    resource_server_stub = _ResourceServerStub()

    provision_mock = (
        AsyncMock(side_effect=provision_side_effect)
        if provision_side_effect
        else AsyncMock(return_value=provision_result)
    )

    init_mock = (
        MagicMock(side_effect=initialize_side_effect)
        if initialize_side_effect
        else MagicMock(return_value=None)
    )

    captured: dict[str, Any] = {
        "facilitator_stub": facilitator_stub,
        "resource_server_stub": resource_server_stub,
        "provision_mock": provision_mock,
        "init_mock": init_mock,
        "facilitator_factory_mock": MagicMock(return_value=facilitator_stub),
        "routes_passed_to_super": None,
    }

    original_init = CdpResourceServer.__mro__[1].__init__  # type: ignore[misc]

    def _init_spy(self: Any, server: Any, routes: dict[str, Any]) -> None:
        captured["routes_passed_to_super"] = routes
        original_init(self, server, routes)

    captures_patch_targets = [
        patch(
            "cdp_x402.core.resource_server.create_cdp_facilitator_client",
            captured["facilitator_factory_mock"],
        ),
        patch(
            "cdp_x402.core.resource_server.x402ResourceServer",
            return_value=resource_server_stub,
        ),
        patch(
            "cdp_x402.core.resource_server.provision_cdp_accounts",
            provision_mock,
        ),
        patch(
            "cdp_x402.core.resource_server.x402HTTPResourceServer.__init__",
            _init_spy,
        ),
        patch(
            "cdp_x402.core.resource_server.x402HTTPResourceServer.initialize",
            init_mock,
        ),
    ]

    return captures_patch_targets, captured


@pytest.fixture
def cdp_credentials_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CDP_API_KEY_ID", "env-key-id")
    monkeypatch.setenv("CDP_API_KEY_SECRET", "env-key-secret")
    monkeypatch.setenv("CDP_WALLET_SECRET", "env-wallet-secret")
    for key in (
        "CDP_WALLET_TYPE",
        "CDP_ACCOUNT_NAME",
        "CDP_OWNER_ACCOUNT_NAME",
        "CDP_SERVER_WALLET_TYPE",
        "CDP_SERVER_ACCOUNT_NAME",
        "CDP_SERVER_OWNER_ACCOUNT_NAME",
    ):
        monkeypatch.delenv(key, raising=False)


class _stack:
    """Apply a list of ``unittest.mock.patch`` context managers as a stack."""

    def __init__(self, patches: list[Any]) -> None:
        self._patches = patches
        self._exit_stack = ExitStack()

    def __enter__(self) -> _stack:
        for p in self._patches:
            self._exit_stack.enter_context(p)
        return self

    def __exit__(self, *args: Any) -> None:
        self._exit_stack.close()


# ---------------------------------------------------------------------------
# Factory basics
# ---------------------------------------------------------------------------


class TestCreateCdpResourceServer:
    async def test_returns_cdp_resource_server_instance(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            server = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        assert isinstance(server, CdpResourceServer)

    async def test_create_classmethod_is_equivalent_to_factory(
        self, cdp_credentials_env: None
    ) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            a = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
            b = await CdpResourceServer.create({"routes": SIMPLE_ROUTES})
        assert isinstance(a, CdpResourceServer)
        assert isinstance(b, CdpResourceServer)

    async def test_accepts_dataclass_config(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            server = await create_cdp_resource_server(CdpResourceServerConfig(routes=SIMPLE_ROUTES))
        assert isinstance(server, CdpResourceServer)

    async def test_initialize_invoked_during_create(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        captured["init_mock"].assert_called_once()

    async def test_exposes_pay_to_evm_address(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            server = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        assert server.pay_to_evm_address == MOCK_EVM_ADDRESS

    async def test_exposes_pay_to_svm_address(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            server = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        assert server.pay_to_svm_address == MOCK_SVM_ADDRESS

    async def test_exposes_resource_server_handle(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            server = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        assert server.resource_server is captured["resource_server_stub"]

    async def test_owner_wallet_only_set_for_smart_wallets(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow(
            provision_result=_make_provision_result(owner_wallet="my-owner-account")
        )
        with _stack(patches):
            server = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        assert server.owner_wallet == "my-owner-account"


# ---------------------------------------------------------------------------
# Initialization wiring
# ---------------------------------------------------------------------------


class TestInitialization:
    async def test_creates_facilitator_with_explicit_credentials(
        self, cdp_credentials_env: None
    ) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "api_key_id": "my-key",
                    "api_key_secret": "my-secret",
                    "routes": SIMPLE_ROUTES,
                }
            )
        captured["facilitator_factory_mock"].assert_called_once_with(
            api_key_id="my-key", api_key_secret="my-secret"
        )

    async def test_registers_default_schemes(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": SIMPLE_ROUTES})

        register_calls = captured["resource_server_stub"].register_calls
        networks = [n for n, _ in register_calls]
        assert networks.count("eip155:*") == 2
        assert networks.count("solana:*") == 1

    async def test_registers_all_cdp_extensions(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        registered_keys = [
            ext.key for ext in captured["resource_server_stub"].register_extension_calls
        ]
        assert CDP_EXTENSION_GAS_SPONSORING_EIP2612 in registered_keys
        assert CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL in registered_keys
        assert CDP_EXTENSION_BAZAAR in registered_keys

    async def test_passes_credentials_to_provision(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "api_key_id": "cfg-id",
                    "api_key_secret": "cfg-secret",
                    "wallet_secret": "cfg-wallet",
                    "routes": SIMPLE_ROUTES,
                }
            )
        client_config, wallet_config = captured["provision_mock"].call_args.args
        assert client_config.api_key_id == "cfg-id"
        assert client_config.api_key_secret == "cfg-secret"
        assert client_config.wallet_secret == "cfg-wallet"
        assert wallet_config.type == "cdp-eoa"


# ---------------------------------------------------------------------------
# Receiver wallet config isolation
# ---------------------------------------------------------------------------


class TestReceiverWalletConfig:
    async def test_does_not_inherit_generic_wallet_env(
        self, monkeypatch: pytest.MonkeyPatch, cdp_credentials_env: None
    ) -> None:
        monkeypatch.setenv("CDP_WALLET_TYPE", "cdp-smart")
        monkeypatch.setenv("CDP_OWNER_ACCOUNT_NAME", "payer-owner")
        monkeypatch.setenv("CDP_ACCOUNT_NAME", "payer-account")

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": SIMPLE_ROUTES})

        _, wallet_config = captured["provision_mock"].call_args.args
        assert wallet_config.type == "cdp-eoa"
        assert wallet_config.account_name == "x402-receiver-wallet-1"
        assert wallet_config.owner_account_name is None

    async def test_uses_server_scoped_env_vars(
        self, monkeypatch: pytest.MonkeyPatch, cdp_credentials_env: None
    ) -> None:
        monkeypatch.setenv("CDP_SERVER_WALLET_TYPE", "cdp-smart")
        monkeypatch.setenv("CDP_SERVER_OWNER_ACCOUNT_NAME", "server-owner")
        monkeypatch.setenv("CDP_SERVER_ACCOUNT_NAME", "server-account")

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": SIMPLE_ROUTES})

        _, wallet_config = captured["provision_mock"].call_args.args
        assert wallet_config.type == "cdp-smart"
        assert wallet_config.account_name == "server-account"
        assert wallet_config.owner_account_name == "server-owner"

    async def test_requires_explicit_owner_for_smart_wallet(
        self, cdp_credentials_env: None
    ) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match=r"Missing required owner account name"):
                await create_cdp_resource_server(
                    CdpResourceServerConfig(
                        routes=SIMPLE_ROUTES,
                        wallet_config=WalletConfig(type="cdp-smart"),
                    )
                )


# ---------------------------------------------------------------------------
# Route conversion — simplified CDP format
# ---------------------------------------------------------------------------


class TestSimplifiedRouteConversion:
    async def test_default_networks_include_evm_and_svm(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {"routes": {"GET /report": CdpRouteConfig(price="$0.01")}}
            )

        route = captured["routes_passed_to_super"]["GET /report"]
        assert isinstance(route, RouteConfig)
        accepts = route.accepts
        assert isinstance(accepts, list)
        assert len(accepts) == 2
        evm = next(a for a in accepts if str(a.network).startswith("eip155:"))
        svm = next(a for a in accepts if str(a.network).startswith("solana:"))
        assert evm.pay_to == MOCK_EVM_ADDRESS
        assert svm.pay_to == MOCK_SVM_ADDRESS
        assert evm.price == "$0.01"

    async def test_uses_only_specified_networks(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /evm-only": CdpRouteConfig(price="$0.01", networks=["eip155:84532"]),
                    },
                }
            )
        accepts = captured["routes_passed_to_super"]["GET /evm-only"].accepts
        assert isinstance(accepts, PaymentOption)
        assert str(accepts.network) == "eip155:84532"
        assert accepts.pay_to == MOCK_EVM_ADDRESS

    async def test_custom_max_timeout_seconds(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /paid": CdpRouteConfig(
                            price="$0.01",
                            networks=["eip155:8453"],
                            max_timeout_seconds=600,
                        ),
                    },
                }
            )
        accepts = captured["routes_passed_to_super"]["GET /paid"].accepts
        assert isinstance(accepts, PaymentOption)
        assert accepts.max_timeout_seconds == 600

    async def test_passes_description_through(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /paid": CdpRouteConfig(
                            price="$0.01",
                            description="My paid route",
                            networks=["eip155:8453"],
                        ),
                    },
                }
            )
        assert captured["routes_passed_to_super"]["GET /paid"].description == "My paid route"

    async def test_throws_when_routes_empty(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match="at least one payment route"):
                await create_cdp_resource_server({"routes": {}})

    async def test_throws_when_routes_omitted(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match="at least one payment route"):
                await create_cdp_resource_server({})


# ---------------------------------------------------------------------------
# Route conversion — scheme field
# ---------------------------------------------------------------------------


class TestSchemeField:
    async def test_defaults_to_exact(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /report": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                    },
                }
            )
        assert captured["routes_passed_to_super"]["GET /report"].accepts.scheme == "exact"

    async def test_upto_scheme_for_evm_route(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /metered": CdpRouteConfig(
                            price="$0.01", scheme="upto", networks=["eip155:8453"]
                        ),
                    },
                }
            )
        assert captured["routes_passed_to_super"]["GET /metered"].accepts.scheme == "upto"

    async def test_upto_defaults_to_evm_only_networks(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {"routes": {"GET /metered": CdpRouteConfig(price="$0.01", scheme="upto")}}
            )
        accepts = captured["routes_passed_to_super"]["GET /metered"].accepts
        accepts_list = accepts if isinstance(accepts, list) else [accepts]
        networks = [str(a.network) for a in accepts_list]
        assert all(n.startswith("eip155:") for n in networks)
        assert CDP_SERVER_DEFAULT_SVM_NETWORKS[0] not in networks

    async def test_upto_with_solana_network_raises(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match=r'"upto" only supports EVM'):
                await create_cdp_resource_server(
                    {
                        "routes": {
                            "GET /bad": CdpRouteConfig(
                                price="$0.01",
                                scheme="upto",
                                networks=[
                                    "eip155:8453",
                                    "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
                                ],
                            ),
                        },
                    }
                )

    async def test_upto_pay_to_uses_evm_address(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /metered": CdpRouteConfig(
                            price="$0.01", scheme="upto", networks=["eip155:8453"]
                        ),
                    },
                }
            )
        assert captured["routes_passed_to_super"]["GET /metered"].accepts.pay_to == MOCK_EVM_ADDRESS


# ---------------------------------------------------------------------------
# Route conversion — full x402 RouteConfig dict interop
# ---------------------------------------------------------------------------


class TestX402RouteConfigInterop:
    async def test_fills_vacant_pay_to_for_evm(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /evm": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "eip155:8453",
                                "payTo": "",
                                "maxTimeoutSeconds": 300,
                            },
                        },
                    },
                }
            )
        assert captured["routes_passed_to_super"]["GET /evm"].accepts.pay_to == MOCK_EVM_ADDRESS

    async def test_fills_vacant_pay_to_for_solana(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /svm": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
                                "payTo": "",
                                "maxTimeoutSeconds": 300,
                            },
                        },
                    },
                }
            )
        assert captured["routes_passed_to_super"]["GET /svm"].accepts.pay_to == MOCK_SVM_ADDRESS

    async def test_does_not_overwrite_explicit_pay_to(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /explicit": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "eip155:8453",
                                "payTo": "0x1234",
                                "maxTimeoutSeconds": 300,
                            },
                        },
                    },
                }
            )
        assert captured["routes_passed_to_super"]["GET /explicit"].accepts.pay_to == "0x1234"

    async def test_fills_array_of_accepts(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /multi": {
                            "accepts": [
                                {
                                    "scheme": "exact",
                                    "price": "$0.01",
                                    "network": "eip155:84532",
                                    "payTo": "",
                                    "maxTimeoutSeconds": 300,
                                },
                                {
                                    "scheme": "exact",
                                    "price": "$0.01",
                                    "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
                                    "payTo": "",
                                    "maxTimeoutSeconds": 300,
                                },
                            ],
                        },
                    },
                }
            )
        accepts = captured["routes_passed_to_super"]["GET /multi"].accepts
        assert isinstance(accepts, list)
        assert accepts[0].pay_to == MOCK_EVM_ADDRESS
        assert accepts[1].pay_to == MOCK_SVM_ADDRESS

    async def test_unrecognised_network_for_vacant_pay_to_raises(
        self, cdp_credentials_env: None
    ) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match="Cannot fill vacant pay_to for network"):
                await create_cdp_resource_server(
                    {
                        "routes": {
                            "GET /unknown": {
                                "accepts": {
                                    "scheme": "exact",
                                    "price": "$0.01",
                                    "network": "bitcoin:mainnet",
                                    "payTo": "",
                                    "maxTimeoutSeconds": 300,
                                },
                            },
                        },
                    }
                )

    async def test_upto_scheme_with_solana_in_x402_format_raises(
        self, cdp_credentials_env: None
    ) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match=r'"upto" only supports EVM'):
                await create_cdp_resource_server(
                    {
                        "routes": {
                            "GET /invalid-upto": {
                                "accepts": {
                                    "scheme": "upto",
                                    "price": "$0.01",
                                    "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
                                    "payTo": "",
                                    "maxTimeoutSeconds": 300,
                                },
                            },
                        },
                    }
                )

    async def test_mixing_simplified_and_x402_formats(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /simple": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                        "GET /x402": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.02",
                                "network": "eip155:8453",
                                "payTo": "",
                                "maxTimeoutSeconds": 300,
                            },
                        },
                    },
                }
            )
        routes = captured["routes_passed_to_super"]
        assert routes["GET /simple"].accepts.pay_to == MOCK_EVM_ADDRESS
        assert routes["GET /x402"].accepts.pay_to == MOCK_EVM_ADDRESS

    async def test_upto_with_explicit_solana_pay_to_raises(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match=r'"upto" only supports EVM'):
                await create_cdp_resource_server(
                    {
                        "routes": {
                            "GET /bad": {
                                "accepts": {
                                    "scheme": "upto",
                                    "price": "$0.01",
                                    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
                                    "payTo": "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu",
                                },
                            },
                        },
                    }
                )

    async def test_simplified_dict_route_accepted_in_dataclass_config(
        self, cdp_credentials_env: None
    ) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                CdpResourceServerConfig(
                    routes={"GET /report": {"price": "$0.01", "description": "test"}}
                )
            )
        route = captured["routes_passed_to_super"]["GET /report"]
        assert isinstance(route, RouteConfig)
        accepts = route.accepts if isinstance(route.accepts, list) else [route.accepts]
        assert any(o.pay_to == MOCK_EVM_ADDRESS for o in accepts)
        assert route.description == "test"


# ---------------------------------------------------------------------------
# config_path loading
# ---------------------------------------------------------------------------


class TestConfigPath:
    async def test_loads_simplified_routes_from_json_file(
        self, cdp_credentials_env: None, tmp_path: Any
    ) -> None:
        config_file = tmp_path / "x402.config.json"
        config_file.write_text('{"routes": {"GET /from-file": {"price": "$0.05"}}}')

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"config_path": str(config_file)})

        assert "GET /from-file" in captured["routes_passed_to_super"]

    async def test_loads_simplified_routes_with_camelcase_keys_from_json_file(
        self, cdp_credentials_env: None, tmp_path: Any
    ) -> None:
        config_file = tmp_path / "x402.config.json"
        config_file.write_text(
            '{"routes": {"GET /timed": {"price": "$0.01", "maxTimeoutSeconds": 120}}}'
        )

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"config_path": str(config_file)})

        accepts = captured["routes_passed_to_super"]["GET /timed"].accepts
        accepts_list = accepts if isinstance(accepts, list) else [accepts]
        assert all(a.max_timeout_seconds == 120 for a in accepts_list)

    async def test_loads_x402_format_routes_from_json_file(
        self, cdp_credentials_env: None, tmp_path: Any
    ) -> None:
        config_file = tmp_path / "x402.config.json"
        config_file.write_text(
            '{"routes": {"GET /from-file": {"accepts": '
            '{"scheme": "exact", "price": "$0.05", "network": "eip155:8453", "payTo": ""}}}}'
        )

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"config_path": str(config_file)})

        assert "GET /from-file" in captured["routes_passed_to_super"]

    async def test_inline_routes_take_precedence_over_file(
        self, cdp_credentials_env: None, tmp_path: Any
    ) -> None:
        config_file = tmp_path / "x402.config.json"
        config_file.write_text(
            '{"routes": {"GET /file-route": {"accepts": '
            '{"scheme": "exact", "price": "$0.99", "network": "eip155:8453", "payTo": ""}}}}'
        )

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "config_path": str(config_file),
                    "routes": {"GET /inline-route": CdpRouteConfig(price="$0.01")},
                }
            )

        routes = captured["routes_passed_to_super"]
        assert "GET /inline-route" in routes
        assert "GET /file-route" not in routes

    async def test_ignores_config_path_inside_file(
        self, cdp_credentials_env: None, tmp_path: Any
    ) -> None:
        config_file = tmp_path / "x402.config.json"
        config_file.write_text(
            '{"config_path": "./nope.json", "routes": '
            '{"GET /ok": {"accepts": '
            '{"scheme": "exact", "price": "$0.01", "network": "eip155:8453", "payTo": ""}}}}'
        )

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"config_path": str(config_file)})

        assert "GET /ok" in captured["routes_passed_to_super"]


# ---------------------------------------------------------------------------
# Error propagation
# ---------------------------------------------------------------------------


class TestErrorPropagation:
    async def test_provision_errors_propagate(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow(
            provision_side_effect=RuntimeError("Missing CDP_WALLET_SECRET"),
        )
        with _stack(patches):
            with pytest.raises(RuntimeError, match="Missing CDP_WALLET_SECRET"):
                await create_cdp_resource_server({"routes": SIMPLE_ROUTES})

    async def test_initialize_errors_propagate(self, cdp_credentials_env: None) -> None:
        patches, _ = _patch_create_flow(
            initialize_side_effect=RuntimeError("facilitator unavailable"),
        )
        with _stack(patches):
            with pytest.raises(RuntimeError, match="facilitator unavailable"):
                await create_cdp_resource_server({"routes": SIMPLE_ROUTES})


# ---------------------------------------------------------------------------
# Defaults & helpers (no async wiring)
# ---------------------------------------------------------------------------


class TestDefaultsAndHelpers:
    def test_default_networks_contain_evm_and_svm(self) -> None:
        evm = [n for n in CDP_SERVER_DEFAULT_NETWORKS if n.startswith("eip155:")]
        svm = [n for n in CDP_SERVER_DEFAULT_NETWORKS if n.startswith("solana:")]
        assert evm and svm

    def test_default_evm_networks_contain_base_mainnet(self) -> None:
        assert "eip155:8453" in CDP_SERVER_DEFAULT_EVM_NETWORKS

    def test_get_cdp_default_schemes_returns_three_entries(self) -> None:
        schemes = get_cdp_default_schemes()
        assert len(schemes) == 3
        evm_schemes = [s for s in schemes if s.network == "eip155:*"]
        svm_schemes = [s for s in schemes if s.network == "solana:*"]
        assert len(evm_schemes) == 2
        assert len(svm_schemes) == 1

    def test_get_cdp_default_schemes_returns_independent_instances(self) -> None:
        a = get_cdp_default_schemes()
        b = get_cdp_default_schemes()
        for sa, sb in zip(a, b, strict=True):
            assert sa.server is not sb.server

    def test_extension_registrations_match_extension_keys(self) -> None:
        keys = {ext.key for ext in get_cdp_extension_registrations()}
        assert keys == {
            CDP_EXTENSION_GAS_SPONSORING_EIP2612,
            CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
            CDP_EXTENSION_BAZAAR,
        }

    def test_get_cdp_extension_registrations_falls_back_on_import_error(self) -> None:
        import builtins

        real_import = builtins.__import__

        def _raise_on_bazaar(name: str, *args: Any, **kwargs: Any) -> Any:
            if name == "x402.extensions.bazaar":
                raise ImportError("bazaar extras not installed")
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=_raise_on_bazaar):
            registrations = get_cdp_extension_registrations()

        keys = {ext.key for ext in registrations}
        assert CDP_EXTENSION_BAZAAR in keys

    def test_get_cdp_extension_registrations_does_not_swallow_non_import_errors(
        self,
    ) -> None:
        import builtins

        real_import = builtins.__import__

        def _raise_attr_error(name: str, *args: Any, **kwargs: Any) -> Any:
            if name == "x402.extensions.bazaar":
                raise AttributeError("unexpected internal error in bazaar module")
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=_raise_attr_error):
            with pytest.raises(AttributeError, match="unexpected internal error"):
                get_cdp_extension_registrations()


# ---------------------------------------------------------------------------
# Auto-injected extensions
# ---------------------------------------------------------------------------


class TestAutoInjectedExtensions:
    async def test_routes_receive_gas_sponsoring_extensions(
        self, cdp_credentials_env: None
    ) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /report": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                    },
                }
            )
        ext = captured["routes_passed_to_super"]["GET /report"].extensions
        assert ext is not None
        assert ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612] is not None
        assert ext[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL] is not None

    async def test_all_supported_extension_keys_present(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /report": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                    },
                }
            )
        ext = captured["routes_passed_to_super"]["GET /report"].extensions
        assert ext is not None
        for key in CDP_SUPPORTED_EXTENSIONS:
            assert key in ext

    async def test_bazaar_auto_injected_for_get_route(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /report": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                    },
                }
            )
        ext = captured["routes_passed_to_super"]["GET /report"].extensions
        assert ext is not None
        bazaar = ext[CDP_EXTENSION_BAZAAR]
        assert bazaar["info"]["input"]["method"] == "GET"
        assert bazaar["routeTemplate"] == "/report"

    async def test_bazaar_uses_body_type_for_post_route(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "POST /orders": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                    },
                }
            )
        ext = captured["routes_passed_to_super"]["POST /orders"].extensions
        assert ext is not None
        bazaar = ext[CDP_EXTENSION_BAZAAR]
        assert bazaar["info"]["input"]["method"] == "POST"
        assert bazaar["info"]["input"]["bodyType"] == "json"
        assert bazaar["routeTemplate"] == "/orders"

    async def test_user_bazaar_overrides_auto_generated(self, cdp_credentials_env: None) -> None:
        rich = {
            "info": {
                "input": {"type": "http", "method": "GET", "queryParams": {"q": "example"}},
                "output": {"type": "json", "example": {"results": []}},
            },
            "routeTemplate": "/search",
        }
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /search": CdpRouteConfig(
                            price="$0.01",
                            networks=["eip155:8453"],
                            extensions={CDP_EXTENSION_BAZAAR: rich},
                        ),
                    },
                }
            )
        ext = captured["routes_passed_to_super"]["GET /search"].extensions
        assert ext is not None
        assert ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612] is not None
        assert ext[CDP_EXTENSION_BAZAAR] is rich

    async def test_user_gas_sponsoring_override_wins(self, cdp_credentials_env: None) -> None:
        custom = {"customField": "customValue"}
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /report": CdpRouteConfig(
                            price="$0.01",
                            networks=["eip155:8453"],
                            extensions={CDP_EXTENSION_GAS_SPONSORING_EIP2612: custom},
                        ),
                    },
                }
            )
        ext = captured["routes_passed_to_super"]["GET /report"].extensions
        assert ext is not None
        assert ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612] is custom

    async def test_auto_injection_per_route(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /a": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                        "GET /b": CdpRouteConfig(price="$0.02", networks=["eip155:8453"]),
                    },
                }
            )
        for pattern in ("GET /a", "GET /b"):
            ext = captured["routes_passed_to_super"][pattern].extensions
            assert ext is not None
            assert ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612] is not None
            assert ext[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL] is not None

    async def test_auto_injection_for_x402_format_routes(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /explicit": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "eip155:8453",
                                "payTo": "",
                                "maxTimeoutSeconds": 300,
                            },
                        },
                    },
                }
            )
        ext = captured["routes_passed_to_super"]["GET /explicit"].extensions
        assert ext is not None
        assert ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612] is not None
        assert ext[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL] is not None


# ---------------------------------------------------------------------------
# build_bazaar_declaration parity
# ---------------------------------------------------------------------------


class TestBuildBazaarDeclaration:
    def test_query_method_omits_body_type(self) -> None:
        decl = build_bazaar_declaration("GET", "/report")
        assert "bodyType" not in decl["info"]["input"]
        assert decl["routeTemplate"] == "/report"

    def test_body_method_includes_body_type(self) -> None:
        decl = build_bazaar_declaration("POST", "/orders")
        assert decl["info"]["input"]["bodyType"] == "json"

    def test_schema_matches_method_enum(self) -> None:
        decl = build_bazaar_declaration("DELETE", "/users/:id")
        method_schema = decl["schema"]["properties"]["input"]["properties"]["method"]
        assert method_schema["enum"] == ["DELETE"]


# ---------------------------------------------------------------------------
# Receiver-wallet env isolation regression
# ---------------------------------------------------------------------------


class TestReceiverWalletEnvIsolation:
    async def test_garbage_cdp_wallet_type_does_not_break_server_creation(
        self, monkeypatch: pytest.MonkeyPatch, cdp_credentials_env: None
    ) -> None:
        monkeypatch.setenv("CDP_WALLET_TYPE", "garbage-value-that-would-have-thrown")

        patches, _ = _patch_create_flow()
        with _stack(patches):
            server = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        assert isinstance(server, CdpResourceServer)


# ---------------------------------------------------------------------------
# None payTo handling
# ---------------------------------------------------------------------------


class TestNonePayTo:
    async def test_fills_none_pay_to_for_evm(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /no-pay-to": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "eip155:8453",
                            },
                        },
                    },
                }
            )
        assert (
            captured["routes_passed_to_super"]["GET /no-pay-to"].accepts.pay_to == MOCK_EVM_ADDRESS
        )

    async def test_fills_none_pay_to_for_solana(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /no-pay-to-svm": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
                            },
                        },
                    },
                }
            )
        assert (
            captured["routes_passed_to_super"]["GET /no-pay-to-svm"].accepts.pay_to
            == MOCK_SVM_ADDRESS
        )

    async def test_fills_literal_none_pay_to_from_route_config_dataclass(
        self, cdp_credentials_env: None
    ) -> None:
        option = PaymentOption(
            scheme="exact",
            pay_to=None,  # type: ignore[arg-type]
            price="$0.01",
            network="eip155:8453",
        )
        route = RouteConfig(accepts=option)
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": {"GET /r": route}})
        result_accepts = captured["routes_passed_to_super"]["GET /r"].accepts
        assert isinstance(result_accepts, PaymentOption)
        assert result_accepts.pay_to == MOCK_EVM_ADDRESS

    async def test_fills_literal_none_pay_to_for_solana(self, cdp_credentials_env: None) -> None:
        option = PaymentOption(
            scheme="exact",
            pay_to=None,  # type: ignore[arg-type]
            price="$0.01",
            network="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        )
        route = RouteConfig(accepts=option)
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": {"GET /r": route}})
        result_accepts = captured["routes_passed_to_super"]["GET /r"].accepts
        assert isinstance(result_accepts, PaymentOption)
        assert result_accepts.pay_to == MOCK_SVM_ADDRESS


# ---------------------------------------------------------------------------
# RouteConfig dataclass support
# ---------------------------------------------------------------------------


class TestRouteConfigDataclassSupport:
    async def test_x402_route_config_dataclass_accepted(self, cdp_credentials_env: None) -> None:
        option = PaymentOption(
            scheme="exact",
            pay_to="",
            price="$0.01",
            network="eip155:8453",
            max_timeout_seconds=300,
        )
        route_config = RouteConfig(accepts=option)

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /x402-dataclass": route_config,
                    },
                }
            )

        route = captured["routes_passed_to_super"]["GET /x402-dataclass"]
        assert isinstance(route, RouteConfig)
        assert isinstance(route.accepts, PaymentOption)
        assert route.accepts.pay_to == MOCK_EVM_ADDRESS

    async def test_route_config_mixed_with_cdp_route_config(
        self, cdp_credentials_env: None
    ) -> None:
        option = PaymentOption(
            scheme="exact",
            pay_to="",
            price="$0.02",
            network="eip155:8453",
            max_timeout_seconds=300,
        )
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /simple": CdpRouteConfig(price="$0.01", networks=["eip155:8453"]),
                        "GET /x402": RouteConfig(accepts=option),
                    },
                }
            )

        routes = captured["routes_passed_to_super"]
        assert routes["GET /simple"].accepts.pay_to == MOCK_EVM_ADDRESS
        assert routes["GET /x402"].accepts.pay_to == MOCK_EVM_ADDRESS


# ---------------------------------------------------------------------------
# RouteConfig field preservation
# ---------------------------------------------------------------------------


class TestRouteConfigFieldPreservation:
    async def test_route_config_mime_type_preserved(self, cdp_credentials_env: None) -> None:
        option = PaymentOption(scheme="exact", pay_to="", price="$0.01", network="eip155:8453")
        route = RouteConfig(accepts=option, mime_type="application/json")
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": {"GET /r": route}})
        assert captured["routes_passed_to_super"]["GET /r"].mime_type == "application/json"

    async def test_route_config_resource_url_preserved(self, cdp_credentials_env: None) -> None:
        option = PaymentOption(scheme="exact", pay_to="", price="$0.01", network="eip155:8453")
        route = RouteConfig(accepts=option, resource="https://example.com/r")
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": {"GET /r": route}})
        assert captured["routes_passed_to_super"]["GET /r"].resource == "https://example.com/r"

    async def test_route_config_hook_timeout_preserved(self, cdp_credentials_env: None) -> None:
        option = PaymentOption(scheme="exact", pay_to="", price="$0.01", network="eip155:8453")
        route = RouteConfig(accepts=option, hook_timeout_seconds=60.0)
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": {"GET /r": route}})
        assert captured["routes_passed_to_super"]["GET /r"].hook_timeout_seconds == 60.0

    async def test_payment_option_extra_preserved_on_route_config(
        self, cdp_credentials_env: None
    ) -> None:
        custom_extra = {"assetTransferMethod": "permit2", "customKey": "value"}
        option = PaymentOption(
            scheme="exact",
            pay_to="",
            price="$0.01",
            network="eip155:8453",
            extra=custom_extra,
        )
        route = RouteConfig(accepts=option)
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": {"GET /r": route}})
        result_accepts = captured["routes_passed_to_super"]["GET /r"].accepts
        assert isinstance(result_accepts, PaymentOption)
        assert result_accepts.extra == custom_extra

    async def test_payment_option_extra_preserved_on_list_accepts(
        self, cdp_credentials_env: None
    ) -> None:
        extra_evm = {"assetTransferMethod": "permit2"}
        extra_svm = {"customField": "abc"}
        options = [
            PaymentOption(
                scheme="exact",
                pay_to="",
                price="$0.01",
                network="eip155:8453",
                extra=extra_evm,
            ),
            PaymentOption(
                scheme="exact",
                pay_to="",
                price="$0.01",
                network="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
                extra=extra_svm,
            ),
        ]
        route = RouteConfig(accepts=options)
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": {"GET /r": route}})
        result_accepts = captured["routes_passed_to_super"]["GET /r"].accepts
        assert isinstance(result_accepts, list)
        assert result_accepts[0].extra == extra_evm
        assert result_accepts[1].extra == extra_svm

    async def test_dict_route_mime_type_preserved(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /r": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "eip155:8453",
                                "payTo": "",
                            },
                            "mimeType": "text/plain",
                        }
                    }
                }
            )
        assert captured["routes_passed_to_super"]["GET /r"].mime_type == "text/plain"

    async def test_dict_route_description_preserved(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /r": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "eip155:8453",
                                "payTo": "",
                            },
                            "description": "My route description",
                        }
                    }
                }
            )
        assert captured["routes_passed_to_super"]["GET /r"].description == "My route description"

    async def test_dict_route_hook_timeout_camelcase_preserved(
        self, cdp_credentials_env: None
    ) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server(
                {
                    "routes": {
                        "GET /r": {
                            "accepts": {
                                "scheme": "exact",
                                "price": "$0.01",
                                "network": "eip155:8453",
                                "payTo": "",
                            },
                            "hookTimeoutSeconds": 42.0,
                        }
                    }
                }
            )
        assert captured["routes_passed_to_super"]["GET /r"].hook_timeout_seconds == 42.0


# ---------------------------------------------------------------------------
# Wallet type isolation
# ---------------------------------------------------------------------------


class TestServerWalletTypeIsolation:
    async def test_unsupported_generic_wallet_type_does_not_block_server(
        self, monkeypatch: pytest.MonkeyPatch, cdp_credentials_env: None
    ) -> None:
        monkeypatch.setenv("CDP_WALLET_TYPE", "privy")

        patches, _ = _patch_create_flow()
        with _stack(patches):
            server = await create_cdp_resource_server({"routes": SIMPLE_ROUTES})
        assert isinstance(server, CdpResourceServer)

    async def test_client_config_shim_carries_resolved_server_wallet_type(
        self, monkeypatch: pytest.MonkeyPatch, cdp_credentials_env: None
    ) -> None:
        monkeypatch.setenv("CDP_WALLET_TYPE", "cdp-smart")
        monkeypatch.setenv("CDP_OWNER_ACCOUNT_NAME", "payer-owner")

        patches, captured = _patch_create_flow()
        with _stack(patches):
            await create_cdp_resource_server({"routes": SIMPLE_ROUTES})

        client_config, _ = captured["provision_mock"].call_args.args
        assert client_config.wallet_config is not None
        assert client_config.wallet_config.type == "cdp-eoa"


# ---------------------------------------------------------------------------
# Empty-routes check before provisioning
# ---------------------------------------------------------------------------


class TestEmptyRoutesBeforeProvisioning:
    async def test_empty_routes_raises_before_provisioning(self, cdp_credentials_env: None) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match="at least one payment route"):
                await create_cdp_resource_server({"routes": {}})

        captured["provision_mock"].assert_not_called()

    async def test_missing_routes_raises_before_provisioning(
        self, cdp_credentials_env: None
    ) -> None:
        patches, captured = _patch_create_flow()
        with _stack(patches):
            with pytest.raises(ValueError, match="at least one payment route"):
                await create_cdp_resource_server({})

        captured["provision_mock"].assert_not_called()
