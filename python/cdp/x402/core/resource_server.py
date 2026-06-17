"""CDP-powered x402 resource server for Python."""

from __future__ import annotations

import copy
import dataclasses
import json
import os
from collections.abc import Mapping, Sequence
from typing import TYPE_CHECKING, Any, Literal, cast

from pydantic import ConfigDict
from pydantic.dataclasses import dataclass
from x402.http import PaymentOption, RouteConfig, x402HTTPResourceServer
from x402.server import x402ResourceServer

from cdp.x402.core.constants import BASE_MAINNET_CAIP2, SOLANA_MAINNET_CAIP2
from cdp.x402.core.extensions import (
    CDP_EXTENSION_BAZAAR,
    CDP_SUPPORTED_EXTENSIONS,
    build_bazaar_declaration,
    get_cdp_extension_registrations,
)
from cdp.x402.core.facilitator import create_cdp_facilitator_client
from cdp.x402.core.wallets.config import (
    ResolvedWalletConfig,
    WalletConfig,
    resolve_wallet_type,
)
from cdp.x402.core.wallets.provision import provision_cdp_accounts

_DEFAULT_SERVER_ACCOUNT_NAME = "x402-receiver-wallet-1"

CDP_SERVER_DEFAULT_EVM_NETWORKS: tuple[str, ...] = (BASE_MAINNET_CAIP2,)
CDP_SERVER_DEFAULT_SVM_NETWORKS: tuple[str, ...] = (SOLANA_MAINNET_CAIP2,)
CDP_SERVER_DEFAULT_NETWORKS: tuple[str, ...] = (
    *CDP_SERVER_DEFAULT_EVM_NETWORKS,
    *CDP_SERVER_DEFAULT_SVM_NETWORKS,
)

CDPPaymentScheme = Literal["exact", "upto"]


@dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class CDPRouteConfig:
    """Simplified CDP-owned route configuration."""

    price: str
    description: str | None = None
    scheme: CDPPaymentScheme = "exact"
    networks: Sequence[str] | None = None
    max_timeout_seconds: int = 300
    extensions: dict[str, Any] | None = None


if TYPE_CHECKING:
    _RoutesField = dict[str, CDPRouteConfig | RouteConfig | dict[str, Any]] | None
else:
    _RoutesField = Any


@dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class CDPResourceServerConfig:
    """Configuration for :func:`create_cdp_resource_server`."""

    api_key_id: str | None = None
    api_key_secret: str | None = None
    wallet_secret: str | None = None
    wallet_config: WalletConfig | None = None
    routes: _RoutesField = None
    config_path: str | None = None


@dataclass(config=ConfigDict(arbitrary_types_allowed=True))
class CDPSchemeRegistration:
    """A scheme + network pair used to register payment schemes."""

    network: str
    server: Any


def get_cdp_default_schemes() -> list[CDPSchemeRegistration]:
    """Return the default CDP scheme registrations."""
    try:
        from x402.mechanisms.evm.exact import ExactEvmServerScheme
        from x402.mechanisms.evm.upto import UptoEvmServerScheme
        from x402.mechanisms.svm.exact import ExactSvmServerScheme
    except ModuleNotFoundError as exc:
        raise ImportError(
            "CDPResourceServer requires x402 server mechanisms. "
            "Install dependencies with x402 mechanism extras (for example, "
            "`x402[mechanisms]`)."
        ) from exc

    return [
        CDPSchemeRegistration(network="eip155:*", server=ExactEvmServerScheme()),  # type: ignore[no-untyped-call]
        CDPSchemeRegistration(network="eip155:*", server=UptoEvmServerScheme()),  # type: ignore[no-untyped-call]
        CDPSchemeRegistration(network="solana:*", server=ExactSvmServerScheme()),  # type: ignore[no-untyped-call]
    ]


def _is_vacant_pay_to(pay_to: str) -> bool:
    return pay_to.strip() == ""


def _resolve_server_wallet_config(config: WalletConfig | None) -> ResolvedWalletConfig:
    raw_type = (config.type if config and config.type else None) or os.environ.get(
        "CDP_SERVER_WALLET_TYPE"
    )
    wallet_type = resolve_wallet_type(raw_type)
    account_name = (
        (config.account_name if config else None)
        or os.environ.get("CDP_SERVER_ACCOUNT_NAME")
        or _DEFAULT_SERVER_ACCOUNT_NAME
    )
    owner_account_name = (config.owner_account_name if config else None) or os.environ.get(
        "CDP_SERVER_OWNER_ACCOUNT_NAME"
    )
    if wallet_type == "cdp-smart" and not owner_account_name:
        raise ValueError(
            'Missing required owner account name for wallet type "cdp-smart". '
            "Provide it via wallet_config.owner_account_name or set "
            "CDP_SERVER_OWNER_ACCOUNT_NAME."
        )
    return ResolvedWalletConfig(
        type=wallet_type,
        account_name=account_name,
        owner_account_name=owner_account_name,
    )


def _is_evm_only_scheme(scheme: str) -> bool:
    return scheme == "upto"


def _assert_scheme_supports_network(scheme: str, network: str) -> None:
    if _is_evm_only_scheme(scheme) and not network.startswith("eip155:"):
        raise ValueError(
            f'Scheme "{scheme}" only supports EVM (eip155:*) networks. '
            f'Network "{network}" is not supported. '
            'Remove it from the networks list or use scheme "exact".'
        )


def _fill_payment_option_pay_to(
    opt: PaymentOption,
    evm_address: str,
    svm_address: str,
) -> PaymentOption:
    network = str(opt.network)
    _assert_scheme_supports_network(str(opt.scheme), network)
    if opt.pay_to is not None and not isinstance(opt.pay_to, str):
        return opt
    if isinstance(opt.pay_to, str) and not _is_vacant_pay_to(opt.pay_to):
        return opt
    if network.startswith("eip155:"):
        return dataclasses.replace(opt, pay_to=evm_address)
    if network.startswith("solana:"):
        return dataclasses.replace(opt, pay_to=svm_address)
    raise ValueError(
        f'Cannot fill vacant pay_to for network "{network}": '
        "unrecognised network family."
    )


def _fill_route_config_pay_to(
    route: RouteConfig,
    evm_address: str,
    svm_address: str,
) -> RouteConfig:
    accepts = route.accepts
    if isinstance(accepts, list):
        filled_accepts: PaymentOption | list[PaymentOption] = [
            _fill_payment_option_pay_to(o, evm_address, svm_address) for o in accepts
        ]
    else:
        filled_accepts = _fill_payment_option_pay_to(accepts, evm_address, svm_address)
    return dataclasses.replace(route, accepts=filled_accepts)


def _parse_route_dict(config: dict[str, Any]) -> RouteConfig:
    accepts_raw = config.get("accepts", [])
    if isinstance(accepts_raw, dict):
        accepts_raw = [accepts_raw]
    payment_options: list[PaymentOption] = []
    for acc in accepts_raw:
        if isinstance(acc, PaymentOption):
            payment_options.append(acc)
        else:
            payment_options.append(
                PaymentOption(
                    scheme=acc.get("scheme", ""),
                    pay_to=acc.get("payTo", acc.get("pay_to", "")),
                    price=acc.get("price", ""),
                    network=acc.get("network", ""),
                    max_timeout_seconds=acc.get(
                        "maxTimeoutSeconds", acc.get("max_timeout_seconds")
                    ),
                    extra=acc.get("extra"),
                )
            )
    accepts: PaymentOption | list[PaymentOption] = (
        payment_options[0] if len(payment_options) == 1 else payment_options
    )
    return RouteConfig(
        accepts=accepts,
        resource=config.get("resource"),
        description=config.get("description"),
        mime_type=config.get("mimeType", config.get("mime_type")),
        custom_paywall_html=config.get("customPaywallHtml", config.get("custom_paywall_html")),
        unpaid_response_body=config.get("unpaidResponseBody", config.get("unpaid_response_body")),
        settlement_failed_response_body=config.get(
            "settlementFailedResponseBody", config.get("settlement_failed_response_body")
        ),
        extensions=config.get("extensions"),
        hook_timeout_seconds=config.get("hook_timeout_seconds", config.get("hookTimeoutSeconds")),
    )


def _convert_cdp_route(
    route: CDPRouteConfig,
    evm_address: str,
    svm_address: str,
) -> RouteConfig:
    scheme = route.scheme or "exact"
    default_networks = (
        CDP_SERVER_DEFAULT_EVM_NETWORKS
        if _is_evm_only_scheme(scheme)
        else CDP_SERVER_DEFAULT_NETWORKS
    )
    networks: Sequence[str] = route.networks if route.networks is not None else default_networks
    max_timeout_seconds = route.max_timeout_seconds
    payment_options: list[PaymentOption] = []
    for network in networks:
        _assert_scheme_supports_network(scheme, network)
        if network.startswith("eip155:"):
            pay_to = evm_address
        elif network.startswith("solana:"):
            pay_to = svm_address
        else:
            raise ValueError(
                f'Cannot resolve pay_to for network "{network}": unrecognised network family.'
            )
        payment_options.append(
            PaymentOption(
                scheme=scheme,
                price=route.price,
                network=network,
                pay_to=pay_to,
                max_timeout_seconds=max_timeout_seconds,
            )
        )
    accepts: PaymentOption | list[PaymentOption] = (
        payment_options[0] if len(payment_options) == 1 else payment_options
    )
    return RouteConfig(
        accepts=accepts,
        description=route.description,
        extensions=route.extensions,
    )


def _parse_route_key_for_bazaar(pattern: str) -> tuple[str, str] | None:
    space_idx = pattern.find(" ")
    if space_idx == -1:
        return None
    method = pattern[:space_idx].upper()
    path = pattern[space_idx + 1 :]
    if method == "*" or not path.startswith("/"):
        return None
    return method, path


def _with_auto_injected_extensions(pattern: str, route: RouteConfig) -> RouteConfig:
    bazaar_pair = _parse_route_key_for_bazaar(pattern)
    user_extensions = route.extensions or {}
    merged: dict[str, Any] = copy.deepcopy(CDP_SUPPORTED_EXTENSIONS)
    if bazaar_pair is not None:
        method, path = bazaar_pair
        merged[CDP_EXTENSION_BAZAAR] = build_bazaar_declaration(method, path)
    merged.update(user_extensions)
    return dataclasses.replace(route, extensions=merged)


def _resolve_routes(
    routes: Mapping[str, CDPRouteConfig | RouteConfig | dict[str, Any]],
    evm_address: str,
    svm_address: str,
) -> dict[str, RouteConfig]:
    result: dict[str, RouteConfig] = {}
    for pattern, route in routes.items():
        if isinstance(route, CDPRouteConfig):
            resolved = _convert_cdp_route(route, evm_address, svm_address)
        elif isinstance(route, RouteConfig):
            resolved = _fill_route_config_pay_to(route, evm_address, svm_address)
        elif isinstance(route, dict):
            if "accepts" in route:
                resolved = _fill_route_config_pay_to(
                    _parse_route_dict(route), evm_address, svm_address
                )
            elif "price" in route:
                cdp_route = CDPRouteConfig(
                    price=route["price"],
                    description=route.get("description"),
                    scheme=route.get("scheme") or "exact",
                    networks=route.get("networks"),
                    max_timeout_seconds=int(
                        route.get("max_timeout_seconds") or route.get("maxTimeoutSeconds") or 300
                    ),
                    extensions=route.get("extensions"),
                )
                resolved = _convert_cdp_route(cdp_route, evm_address, svm_address)
            else:
                raise ValueError(
                    f"Route {pattern!r} dict must have an 'accepts' key (full x402 format) "
                    "or a 'price' key (simplified CDP format)."
                )
        else:
            raise TypeError(
                f"Route {pattern!r} must be a CDPRouteConfig, RouteConfig, or x402 dict, "
                f"got {type(route).__name__}."
            )
        result[pattern] = _with_auto_injected_extensions(pattern, resolved)
    return result


def _load_config_file(file_path: str) -> dict[str, Any]:
    with open(file_path, encoding="utf-8") as fh:
        parsed = json.load(fh)
    if not isinstance(parsed, dict):
        raise ValueError(f"Config file {file_path!r} must contain a JSON object.")
    parsed.pop("config_path", None)
    parsed.pop("configPath", None)
    return cast(dict[str, Any], parsed)


def _coerce_config(
    config: CDPResourceServerConfig | Mapping[str, Any],
) -> CDPResourceServerConfig:
    if isinstance(config, CDPResourceServerConfig):
        return config
    if not isinstance(config, Mapping):
        raise TypeError(
            f"config must be CDPResourceServerConfig or a mapping, got {type(config).__name__}"
        )

    wallet_config_raw = config.get("wallet_config") or config.get("walletConfig")
    if wallet_config_raw is not None and not isinstance(wallet_config_raw, WalletConfig):
        wallet_config_raw = WalletConfig(
            type=wallet_config_raw.get("type"),
            account_name=wallet_config_raw.get("account_name")
            or wallet_config_raw.get("accountName"),
            owner_account_name=wallet_config_raw.get("owner_account_name")
            or wallet_config_raw.get("ownerAccountName"),
        )

    routes_raw: Mapping[str, Any] | None = config.get("routes")
    coerced_routes: dict[str, CDPRouteConfig | RouteConfig | dict[str, Any]] | None = None
    if routes_raw is not None:
        coerced_routes = {}
        for pattern, value in routes_raw.items():
            if isinstance(value, (CDPRouteConfig, RouteConfig)):
                coerced_routes[pattern] = value
            elif isinstance(value, dict):
                if "accepts" not in value and "price" in value:
                    coerced_routes[pattern] = CDPRouteConfig(
                        price=value["price"],
                        description=value.get("description"),
                        scheme=value.get("scheme") or "exact",
                        networks=value.get("networks"),
                        max_timeout_seconds=int(
                            value.get("max_timeout_seconds")
                            or value.get("maxTimeoutSeconds")
                            or 300
                        ),
                        extensions=value.get("extensions"),
                    )
                else:
                    coerced_routes[pattern] = value
            else:
                raise TypeError(
                    f"Route {pattern!r} must be a CDPRouteConfig or dict, "
                    f"got {type(value).__name__}."
                )

    return CDPResourceServerConfig(
        api_key_id=config.get("api_key_id") or config.get("apiKeyId"),
        api_key_secret=config.get("api_key_secret") or config.get("apiKeySecret"),
        wallet_secret=config.get("wallet_secret") or config.get("walletSecret"),
        wallet_config=wallet_config_raw,
        routes=coerced_routes,
        config_path=config.get("config_path") or config.get("configPath"),
    )


class CDPResourceServer(x402HTTPResourceServer):
    """A CDP-powered x402 resource server that extends ``x402HTTPResourceServer``."""

    def __init__(
        self,
        resource_server: x402ResourceServer,
        routes: dict[str, RouteConfig],
        pay_to_evm_address: str,
        pay_to_svm_address: str,
        owner_wallet: str | None = None,
    ) -> None:
        super().__init__(resource_server, routes)
        self._pay_to_evm_address = pay_to_evm_address
        self._pay_to_svm_address = pay_to_svm_address
        self._owner_wallet = owner_wallet

    @property
    def pay_to_evm_address(self) -> str:
        return self._pay_to_evm_address

    @property
    def pay_to_svm_address(self) -> str:
        return self._pay_to_svm_address

    @property
    def owner_wallet(self) -> str | None:
        return self._owner_wallet

    @property
    def resource_server(self) -> x402ResourceServer:
        return cast(x402ResourceServer, self._server)

    @property
    def routes_config(self) -> dict[str, RouteConfig]:
        return cast(dict[str, RouteConfig], self._routes_config)

    @classmethod
    async def create(
        cls,
        config: CDPResourceServerConfig | Mapping[str, Any],
    ) -> CDPResourceServer:
        merged = _coerce_config(config)

        if merged.config_path:
            file_config = _load_config_file(merged.config_path)
            file_dataclass = _coerce_config(file_config)
            merged = CDPResourceServerConfig(
                api_key_id=merged.api_key_id
                if merged.api_key_id is not None
                else file_dataclass.api_key_id,
                api_key_secret=merged.api_key_secret
                if merged.api_key_secret is not None
                else file_dataclass.api_key_secret,
                wallet_secret=merged.wallet_secret
                if merged.wallet_secret is not None
                else file_dataclass.wallet_secret,
                wallet_config=merged.wallet_config
                if merged.wallet_config is not None
                else file_dataclass.wallet_config,
                routes=merged.routes if merged.routes is not None else file_dataclass.routes,
                config_path=None,
            )

        if not merged.routes or len(merged.routes) == 0:
            raise ValueError("CDPResourceServer requires at least one payment route.")

        api_key_id = merged.api_key_id or os.environ.get("CDP_SERVER_API_KEY_ID")
        api_key_secret = merged.api_key_secret or os.environ.get("CDP_SERVER_API_KEY_SECRET")
        wallet_secret = merged.wallet_secret or os.environ.get("CDP_SERVER_WALLET_SECRET")

        facilitator_client = create_cdp_facilitator_client(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
        )
        resource_server = x402ResourceServer(facilitator_client)
        for scheme in get_cdp_default_schemes():
            resource_server.register(scheme.network, scheme.server)
        for ext in get_cdp_extension_registrations():
            resource_server.register_extension(ext)

        wallet_config = _resolve_server_wallet_config(merged.wallet_config)

        from cdp.x402.core.client import CDPx402ClientConfig

        client_config = CDPx402ClientConfig(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            wallet_secret=wallet_secret,
            wallet_config=WalletConfig(type=wallet_config.type),
        )
        provision_result = await provision_cdp_accounts(client_config, wallet_config)
        try:
            resolved_routes = _resolve_routes(
                merged.routes, provision_result.evm_address, provision_result.svm_address
            )
            instance = cls(
                resource_server,
                resolved_routes,
                pay_to_evm_address=provision_result.evm_address,
                pay_to_svm_address=provision_result.svm_address,
                owner_wallet=provision_result.owner_wallet,
            )
            instance.initialize()
        finally:
            await provision_result.cdp_client.close()
        return instance


async def create_cdp_resource_server(
    config: CDPResourceServerConfig | Mapping[str, Any],
) -> CDPResourceServer:
    """Create and initialize a CDP-powered x402 resource server."""
    return await CDPResourceServer.create(config)


__all__ = [
    "CDP_SERVER_DEFAULT_EVM_NETWORKS",
    "CDP_SERVER_DEFAULT_NETWORKS",
    "CDP_SERVER_DEFAULT_SVM_NETWORKS",
    "CDPPaymentScheme",
    "CDPResourceServer",
    "CDPResourceServerConfig",
    "CDPRouteConfig",
    "CDPSchemeRegistration",
    "create_cdp_resource_server",
    "get_cdp_default_schemes",
]
