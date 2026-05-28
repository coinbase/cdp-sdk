"""CDP-powered x402 resource server for Python.

:func:`create_cdp_resource_server` is the primary entry point. It accepts a
CDP-owned route configuration (or a path to a JSON config file), provisions
EVM and Solana receiver wallets automatically, and returns a fully
initialized :class:`CdpResourceServer`.

:class:`CdpResourceServer` **extends** :class:`x402.http.x402HTTPResourceServer`
— it is a drop-in replacement and can be passed anywhere an
``x402HTTPResourceServer`` is expected (FastAPI / Starlette adapters, the CDP
:mod:`cdp_x402.integrations` package, etc.).

Routes may be supplied in either format:

- **Simplified CDP format** (:class:`CdpRouteConfig`) — just ``price`` and
  optional ``description`` / ``networks``. The server fills in ``scheme``,
  ``payTo``, and all x402 internals automatically.
- **Full x402 format** (:class:`x402.http.RouteConfig`) — the upstream
  dataclass accepted by :class:`x402HTTPResourceServer`. Vacant ``pay_to``
  fields are filled with the provisioned receiver address. Raw dicts with an
  ``accepts`` key are also accepted and are parsed into ``RouteConfig``
  objects automatically.

Both formats can be mixed within the same ``routes`` map.

Example (simplified format)::

    from cdp_x402 import create_cdp_resource_server

    server = await create_cdp_resource_server({
        "routes": {
            "GET /report": {"price": "$0.01", "description": "AI-generated report"},
        },
    })

Example (full x402 format)::

    server = await create_cdp_resource_server({
        "routes": {
            "GET /report": {
                "accepts": [
                    {"scheme": "exact", "price": "$0.01", "network": "eip155:8453", "payTo": ""},
                    {"scheme": "exact", "price": "$0.01",
                     "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", "payTo": ""},
                ],
            },
        },
    })
"""

from __future__ import annotations

import copy
import dataclasses
import json
import os
from collections.abc import Mapping, Sequence
from typing import Any, Literal, cast

from pydantic import ConfigDict
from pydantic.dataclasses import dataclass
from x402.http import PaymentOption, RouteConfig, x402HTTPResourceServer
from x402.server import x402ResourceServer

from cdp_x402.core.constants import BASE_MAINNET_CAIP2, SOLANA_MAINNET_CAIP2
from cdp_x402.core.extensions import (
    CDP_EXTENSION_BAZAAR,
    CDP_SUPPORTED_EXTENSIONS,
    build_bazaar_declaration,
    get_cdp_extension_registrations,
)
from cdp_x402.core.facilitator import create_cdp_facilitator_client
from cdp_x402.core.wallets.config import (
    ResolvedWalletConfig,
    WalletConfig,
    resolve_wallet_type,
)
from cdp_x402.core.wallets.provision import provision_cdp_accounts

# ---------------------------------------------------------------------------
# Default networks
# ---------------------------------------------------------------------------

_DEFAULT_SERVER_ACCOUNT_NAME = "x402-receiver-wallet-1"

CDP_SERVER_DEFAULT_EVM_NETWORKS: tuple[str, ...] = (BASE_MAINNET_CAIP2,)
"""Default EVM networks (Base mainnet) used when a route omits ``networks``."""

CDP_SERVER_DEFAULT_SVM_NETWORKS: tuple[str, ...] = (SOLANA_MAINNET_CAIP2,)
"""Default Solana networks (Solana mainnet) used when a route omits ``networks``."""

CDP_SERVER_DEFAULT_NETWORKS: tuple[str, ...] = (
    *CDP_SERVER_DEFAULT_EVM_NETWORKS,
    *CDP_SERVER_DEFAULT_SVM_NETWORKS,
)
"""Default networks (Base mainnet + Solana mainnet) for simplified routes."""


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

CdpPaymentScheme = Literal["exact", "upto"]
"""Payment scheme identifiers supported by the simplified CDP route format.

- ``"exact"`` — (default) Transfer a fixed amount, locked at signing time.
  Supports EVM and Solana networks.
- ``"upto"`` — Usage-based billing: the client authorizes a maximum amount
  and the server settles the actual amount charged (≤ max) via Permit2.
  EVM-only (``eip155:*``).
"""


@dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class CdpRouteConfig:
    """Simplified CDP-owned route configuration.

    Specifying just ``price`` (and optionally ``description`` / ``networks``)
    is enough for most routes; :class:`CdpResourceServer` expands this into
    the full x402 ``RouteConfig`` format with ``scheme``, ``payTo``, and
    ``maxTimeoutSeconds`` filled in.

    For routes that need fine-grained control (custom scheme, explicit
    ``payTo``, etc.) pass a full x402 ``RouteConfigDict`` instead — both
    formats are accepted in the same ``routes`` map.
    """

    price: str
    """Payment amount required for this route, e.g. ``"$0.01"``."""

    description: str | None = None
    """Human-readable description of what this route provides."""

    scheme: CdpPaymentScheme = "exact"
    """Payment scheme. ``"upto"`` is EVM-only — ``networks`` must not include
    Solana when set, otherwise an error is raised. With no explicit
    ``networks`` the default falls back to
    :data:`CDP_SERVER_DEFAULT_EVM_NETWORKS` (Base mainnet only).
    """

    networks: Sequence[str] | None = None
    """CAIP-2 network identifiers. Defaults to
    :data:`CDP_SERVER_DEFAULT_NETWORKS` for ``"exact"``, or
    :data:`CDP_SERVER_DEFAULT_EVM_NETWORKS` for ``"upto"``.
    """

    max_timeout_seconds: int = 300
    """Maximum seconds a payment token is valid before expiry."""

    extensions: dict[str, Any] | None = None
    """Extension overrides for this route.

    All three CDP extensions (``eip2612GasSponsoring``,
    ``erc20ApprovalGasSponsoring``, ``bazaar``) are injected automatically.
    Use this field to override the auto-generated Bazaar declaration with
    richer discovery metadata.
    """


@dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class CdpResourceServerConfig:
    """Configuration for :func:`create_cdp_resource_server`.

    All credential fields fall back to standard environment variables, so an
    instance with just ``routes`` populated is sufficient in most CI and
    production environments.

    Can also be stored in a JSON file and loaded via ``config_path``; the
    schema is identical (minus ``config_path`` itself).
    """

    api_key_id: str | None = None
    """CDP API key ID. Falls back to ``CDP_SERVER_API_KEY_ID``, then ``CDP_API_KEY_ID`` env var."""

    api_key_secret: str | None = None
    """CDP API key secret. Falls back to ``CDP_SERVER_API_KEY_SECRET``, then
    ``CDP_API_KEY_SECRET`` env var."""

    wallet_secret: str | None = None
    """CDP wallet secret used to provision the receiver wallet.
    Falls back to ``CDP_SERVER_WALLET_SECRET``, then ``CDP_WALLET_SECRET`` env var.
    """

    wallet_config: WalletConfig | None = None
    """Receiver wallet configuration.

    Defaults to a CDP Server Wallet (EOA) named ``"x402-receiver-wallet-1"``.
    Unlike the client wallet, receiver-wallet fields do **not** fall back to
    the generic wallet env vars (``CDP_WALLET_TYPE``, ``CDP_ACCOUNT_NAME``,
    ``CDP_OWNER_ACCOUNT_NAME``) to avoid accidentally reusing payer-side
    config in shared-process environments.

    Server-specific env fallbacks are honored instead:

    - ``CDP_SERVER_WALLET_TYPE`` (defaults to ``"cdp-eoa"``)
    - ``CDP_SERVER_ACCOUNT_NAME`` (defaults to ``"x402-receiver-wallet-1"``)
    - ``CDP_SERVER_OWNER_ACCOUNT_NAME`` (required when type is ``"cdp-smart"``)

    Multiple services in the same CDP project that use the default config
    will share a single receiver wallet. Set ``account_name`` explicitly for
    per-service isolation.
    """

    routes: dict[str, Any] | None = None
    """Payment-protected routes served by this server.

    Map of HTTP method + path pattern → route config. Keys use the
    ``"METHOD /path"`` convention, e.g. ``"GET /report"``.

    Each value may be a :class:`CdpRouteConfig` (simplified), an upstream
    :class:`x402.http.RouteConfig` dataclass, or an x402-format ``dict``
    with an ``accepts`` array. Vacant ``payTo`` fields are filled with the
    provisioned receiver address for that network family. All formats can be
    mixed within the same map. May be omitted when ``config_path`` supplies
    the routes.
    """

    config_path: str | None = None
    """Path to a JSON file whose fields are merged with this inline config.
    Inline config takes precedence over file config when both specify the
    same field. ``config_path`` inside the file is ignored to prevent
    circular references.
    """


@dataclass(config=ConfigDict(arbitrary_types_allowed=True))
class CdpSchemeRegistration:
    """A scheme + network pair used to register payment schemes."""

    network: str
    server: Any


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------


def get_cdp_default_schemes() -> list[CdpSchemeRegistration]:
    """Return the default CDP scheme registrations used by ``CdpResourceServer``:

    - ``exact`` for all EVM networks (``eip155:*``)
    - ``upto`` for all EVM networks (``eip155:*``)
    - ``exact`` for all Solana networks (``solana:*``)

    Each call returns fresh scheme-server instances so callers can register
    them on independent servers without state bleed.
    """
    try:
        # Import lazily so ``import cdp_x402`` works in client-only installs
        # without x402 mechanism extras.
        from x402.mechanisms.evm.exact import ExactEvmServerScheme
        from x402.mechanisms.evm.upto import UptoEvmServerScheme
        from x402.mechanisms.svm.exact import ExactSvmServerScheme
    except ModuleNotFoundError as exc:
        raise ImportError(
            "CdpResourceServer requires x402 server mechanisms. "
            "Install dependencies with x402 mechanism extras (for example, "
            "`x402[mechanisms]`)."
        ) from exc

    return [
        CdpSchemeRegistration(network="eip155:*", server=ExactEvmServerScheme()),  # type: ignore[no-untyped-call]
        CdpSchemeRegistration(network="eip155:*", server=UptoEvmServerScheme()),  # type: ignore[no-untyped-call]
        CdpSchemeRegistration(network="solana:*", server=ExactSvmServerScheme()),  # type: ignore[no-untyped-call]
    ]


def _is_vacant_pay_to(pay_to: str) -> bool:
    return pay_to.strip() == ""


def _resolve_server_wallet_config(config: WalletConfig | None) -> ResolvedWalletConfig:
    """Resolve receiver-wallet config without inheriting generic wallet env vars.

    This avoids accidental payer/receiver coupling in shared-process setups
    while still allowing explicit server-scoped env configuration.
    """
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
    """Fill a vacant ``pay_to`` on a ``PaymentOption`` (returns a new instance).

    Scheme/network compatibility is validated unconditionally — matching the
    TypeScript ``fillX402RoutePayTo`` which calls ``assertSchemeSupportsNetwork``
    before the vacant-payTo check. Dynamic ``pay_to`` callables are left untouched;
    ``None`` and empty/whitespace strings are treated as vacant and replaced with
    the appropriate provisioned address.
    """
    network = str(opt.network)
    _assert_scheme_supports_network(str(opt.scheme), network)
    # Non-string, non-None values are dynamic callables — leave them untouched.
    if opt.pay_to is not None and not isinstance(opt.pay_to, str):
        return opt
    # Non-empty string is an explicit address — don't overwrite.
    if isinstance(opt.pay_to, str) and not _is_vacant_pay_to(opt.pay_to):
        return opt
    if network.startswith("eip155:"):
        return dataclasses.replace(opt, pay_to=evm_address)
    if network.startswith("solana:"):
        return dataclasses.replace(opt, pay_to=svm_address)
    raise ValueError(
        f'Cannot fill vacant pay_to for network "{network}": '
        "unrecognised network family. Provide an explicit pay_to "
        "address for this route option."
    )


def _fill_route_config_pay_to(
    route: RouteConfig,
    evm_address: str,
    svm_address: str,
) -> RouteConfig:
    """Fill vacant ``pay_to`` fields across all ``PaymentOption``s in a ``RouteConfig``.

    Returns a new ``RouteConfig``; the original is not mutated.
    """
    accepts = route.accepts
    if isinstance(accepts, list):
        filled_accepts: PaymentOption | list[PaymentOption] = [
            _fill_payment_option_pay_to(o, evm_address, svm_address) for o in accepts
        ]
    else:
        filled_accepts = _fill_payment_option_pay_to(accepts, evm_address, svm_address)
    return dataclasses.replace(route, accepts=filled_accepts)


def _parse_route_dict(config: dict[str, Any]) -> RouteConfig:
    """Parse an x402-format route dict into a :class:`RouteConfig`.

    Mirrors the field-mapping performed by ``x402HTTPServerBase._parse_route_config``
    so that dict-format routes are held as properly-typed ``RouteConfig`` objects
    throughout the CDP layer, preventing silent field loss on any ``RouteConfig``
    attribute (``mime_type``, ``resource``, ``hook_timeout_seconds``, etc.).
    """
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
    route: CdpRouteConfig,
    evm_address: str,
    svm_address: str,
) -> RouteConfig:
    """Expand a simplified ``CdpRouteConfig`` into an upstream :class:`RouteConfig`."""
    scheme = route.scheme
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
    """Parse an x402 route key into ``(method, path)`` for a Bazaar declaration.

    Returns ``None`` when the method cannot be determined (no space separator,
    wildcard ``*``, or path doesn't start with ``/``).
    """
    space_idx = pattern.find(" ")
    if space_idx == -1:
        return None
    method = pattern[:space_idx].upper()
    path = pattern[space_idx + 1 :]
    if method == "*" or not path.startswith("/"):
        return None
    return method, path


def _with_auto_injected_extensions(pattern: str, route: RouteConfig) -> RouteConfig:
    """Merge CDP auto-injected extensions (gas-sponsoring + bazaar) into a ``RouteConfig``.

    User-provided ``route.extensions`` values are spread last so they always win.
    Returns a new ``RouteConfig``; the original is not mutated.
    """
    bazaar_pair = _parse_route_key_for_bazaar(pattern)
    user_extensions = route.extensions or {}
    merged: dict[str, Any] = copy.deepcopy(CDP_SUPPORTED_EXTENSIONS)
    if bazaar_pair is not None:
        method, path = bazaar_pair
        merged[CDP_EXTENSION_BAZAAR] = build_bazaar_declaration(method, path)
    merged.update(user_extensions)
    return dataclasses.replace(route, extensions=merged)


def _resolve_routes(
    routes: Mapping[str, CdpRouteConfig | RouteConfig | dict[str, Any]],
    evm_address: str,
    svm_address: str,
) -> dict[str, RouteConfig]:
    """Resolve a mixed ``routes`` map into a ``dict[str, RouteConfig]``.

    All three input forms are normalised to upstream :class:`RouteConfig` +
    :class:`PaymentOption` objects so that no route metadata is lost and the
    result can be passed directly to :class:`x402HTTPResourceServer` without a
    ``type: ignore``.
    """
    result: dict[str, RouteConfig] = {}
    for pattern, route in routes.items():
        if isinstance(route, CdpRouteConfig):
            resolved = _convert_cdp_route(route, evm_address, svm_address)
        elif isinstance(route, RouteConfig):
            resolved = _fill_route_config_pay_to(route, evm_address, svm_address)
        elif isinstance(route, dict):
            if "accepts" in route:
                resolved = _fill_route_config_pay_to(
                    _parse_route_dict(route), evm_address, svm_address
                )
            elif "price" in route:
                # Simplified CDP format passed as a plain dict (e.g. from a
                # CdpResourceServerConfig dataclass whose route values were not
                # pre-coerced). Mirrors the TS discriminant: "accepts" in route.
                cdp_route = CdpRouteConfig(
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
                    "or a 'price' key (simplified CDP format), or be supplied as a "
                    "CdpRouteConfig instance."
                )
        else:
            raise TypeError(
                f"Route {pattern!r} must be a CdpRouteConfig, RouteConfig, or x402 dict, "
                f"got {type(route).__name__}."
            )
        result[pattern] = _with_auto_injected_extensions(pattern, resolved)
    return result


def _load_config_file(file_path: str) -> dict[str, Any]:
    """Load a JSON config file, dropping ``config_path`` to prevent recursion."""
    with open(file_path, encoding="utf-8") as fh:
        parsed = json.load(fh)
    if not isinstance(parsed, dict):
        raise ValueError(f"Config file {file_path!r} must contain a JSON object.")
    parsed.pop("config_path", None)
    parsed.pop("configPath", None)
    return cast(dict[str, Any], parsed)


def _coerce_config(
    config: CdpResourceServerConfig | Mapping[str, Any],
) -> CdpResourceServerConfig:
    """Accept either a dataclass instance or a mapping (e.g. parsed JSON)."""
    if isinstance(config, CdpResourceServerConfig):
        return config
    if not isinstance(config, Mapping):
        raise TypeError(
            f"config must be CdpResourceServerConfig or a mapping, got {type(config).__name__}"
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
    coerced_routes: dict[str, CdpRouteConfig | RouteConfig | dict[str, Any]] | None = None
    if routes_raw is not None:
        coerced_routes = {}
        for pattern, value in routes_raw.items():
            if isinstance(value, (CdpRouteConfig, RouteConfig)):
                coerced_routes[pattern] = value
            elif isinstance(value, dict):
                if "accepts" not in value and "price" in value:
                    # Simplified CDP format coming from a JSON config file —
                    # coerce camelCase keys to their snake_case equivalents.
                    coerced_routes[pattern] = CdpRouteConfig(
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
                    f"Route {pattern!r} must be a CdpRouteConfig or dict, "
                    f"got {type(value).__name__}."
                )

    return CdpResourceServerConfig(
        api_key_id=config.get("api_key_id") or config.get("apiKeyId"),
        api_key_secret=config.get("api_key_secret") or config.get("apiKeySecret"),
        wallet_secret=config.get("wallet_secret") or config.get("walletSecret"),
        wallet_config=wallet_config_raw,
        routes=coerced_routes,
        config_path=config.get("config_path") or config.get("configPath"),
    )


# ---------------------------------------------------------------------------
# CdpResourceServer
# ---------------------------------------------------------------------------


class CdpResourceServer(x402HTTPResourceServer):
    """A CDP-powered x402 resource server that **extends** ``x402HTTPResourceServer``.

    Drop-in replacement anywhere an :class:`x402HTTPResourceServer` is
    expected — pass it directly to FastAPI / Starlette adapters or the
    :mod:`cdp_x402.integrations` framework wrappers.

    Use :func:`create_cdp_resource_server` (or :meth:`CdpResourceServer.create`)
    to obtain an initialized instance. The constructor is intentionally
    private; call the factory instead.

    In addition to the full ``x402HTTPResourceServer`` surface
    (:meth:`initialize`, :meth:`process_http_request`,
    :meth:`process_settlement`, :meth:`requires_payment`, etc.) this class
    exposes :attr:`pay_to_evm_address`, :attr:`pay_to_svm_address`, and
    :attr:`owner_wallet` for the provisioned receiver wallets.
    """

    def __init__(
        self,
        resource_server: x402ResourceServer,
        routes: dict[str, RouteConfig],
        pay_to_evm_address: str,
        pay_to_svm_address: str,
        owner_wallet: str | None = None,
    ) -> None:
        """Private constructor — use :func:`create_cdp_resource_server` instead."""
        super().__init__(resource_server, routes)
        self._pay_to_evm_address = pay_to_evm_address
        self._pay_to_svm_address = pay_to_svm_address
        self._owner_wallet = owner_wallet

    @property
    def pay_to_evm_address(self) -> str:
        """EVM address of the provisioned receiver wallet (EOA or SCW)."""
        return self._pay_to_evm_address

    @property
    def pay_to_svm_address(self) -> str:
        """Solana address of the provisioned receiver wallet."""
        return self._pay_to_svm_address

    @property
    def owner_wallet(self) -> str | None:
        """Owner account name for ``cdp-smart`` receiver wallets, else ``None``."""
        return self._owner_wallet

    @property
    def resource_server(self) -> x402ResourceServer:
        """The underlying :class:`x402ResourceServer` with schemes registered.

        Alias for the internal ``self._server`` attribute set by the parent
        class.
        """
        return cast(x402ResourceServer, self._server)

    @property
    def routes_config(self) -> dict[str, RouteConfig]:
        """Resolved route config map with ``pay_to`` and extensions filled in.

        Returns the ``dict[str, RouteConfig]`` that was passed to the parent
        :class:`x402HTTPResourceServer` constructor. Values are fully-resolved
        :class:`RouteConfig` objects — all ``pay_to`` fields populated from
        the provisioned receiver wallets, and all CDP extensions injected.

        Useful when bridging to framework middleware that requires a separate
        ``routes`` argument, e.g.::

            from x402.http.middleware.fastapi import payment_middleware

            mw = payment_middleware(
                server.routes_config,
                server.resource_server,
                sync_facilitator_on_start=False,
            )
        """
        return cast(dict[str, RouteConfig], self._routes_config)

    @classmethod
    async def create(
        cls,
        config: CdpResourceServerConfig | Mapping[str, Any],
    ) -> CdpResourceServer:
        """Provision wallets, build the resource server, and sync schemes.

        This is the async entry point. Prefer the module-level
        :func:`create_cdp_resource_server` wrapper for convenience.
        """
        merged = _coerce_config(config)

        if merged.config_path:
            file_config = _load_config_file(merged.config_path)
            file_dataclass = _coerce_config(file_config)

            # Inline values take precedence; only fall back to file values
            # for fields the caller did not explicitly set.
            # Use `is not None` (not truthiness) so that an explicit empty
            # string in inline config always wins over the file value.
            merged = CdpResourceServerConfig(
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

        # Validate routes before doing any I/O (wallet provisioning).
        if not merged.routes or len(merged.routes) == 0:
            raise ValueError("CdpResourceServer requires at least one payment route.")

        # Resolve server-scoped credentials: CDP_SERVER_* takes precedence over
        # the generic CDP_API_KEY_* / CDP_WALLET_SECRET vars so that a process
        # running both client and server roles can configure them independently.
        # The three-level fallback chain for each credential is:
        #   1. Inline config value (merged.*)
        #   2. CDP_SERVER_* env var (resolved here)
        #   3. CDP_API_KEY_* / CDP_WALLET_SECRET env var (resolved inside
        #      create_cdp_facilitator_client / resolve_credentials downstream)
        api_key_id = merged.api_key_id or os.environ.get("CDP_SERVER_API_KEY_ID")
        api_key_secret = merged.api_key_secret or os.environ.get("CDP_SERVER_API_KEY_SECRET")
        wallet_secret = merged.wallet_secret or os.environ.get("CDP_SERVER_WALLET_SECRET")

        # Build the CDP facilitator client and the underlying resource server.
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

        # Lightweight CdpX402ClientConfig shim for credential resolution.
        # Pass the already-resolved server wallet type so resolve_credentials()
        # uses it rather than falling back to the generic CDP_WALLET_TYPE env
        # var, which could be set to a payer-side value in a shared process.
        from cdp_x402.core.client import CdpX402ClientConfig

        client_config = CdpX402ClientConfig(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            wallet_secret=wallet_secret,
            wallet_config=WalletConfig(type=wallet_config.type),
        )
        provision_result = await provision_cdp_accounts(client_config, wallet_config)
        # The resource server only needs the provisioned addresses; close the
        # CdpClient immediately so its underlying HTTP session is not leaked.
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
            # initialize() is sync on x402HTTPResourceServer (it fires the
            # facilitator-supported sync once and validates routes).
            instance.initialize()
        finally:
            await provision_result.cdp_client.close()
        return instance


# ---------------------------------------------------------------------------
# Public factory
# ---------------------------------------------------------------------------


async def create_cdp_resource_server(
    config: CdpResourceServerConfig | Mapping[str, Any],
) -> CdpResourceServer:
    """Create and initialize a CDP-powered x402 resource server.

    Returns a :class:`CdpResourceServer` which **extends**
    :class:`x402HTTPResourceServer` and can be passed directly to any
    framework adapter.

    All credential fields fall back to environment variables; an instance
    with just ``routes`` populated is sufficient in most environments.
    Server-specific env vars (``CDP_SERVER_API_KEY_ID``,
    ``CDP_SERVER_API_KEY_SECRET``, ``CDP_SERVER_WALLET_SECRET``) take
    precedence over the generic payer-side vars (``CDP_API_KEY_ID``, etc.)
    so a single process can act as both payer and receiver without variable
    collisions. Pass ``config_path`` to load routes (and optionally
    credentials) from a JSON file instead.

    Routes accept either the simplified :class:`CdpRouteConfig` format
    (``price`` + optional fields) or the full x402 dict format (with
    ``accepts``). Vacant ``payTo`` fields in x402-format routes are filled
    automatically from the provisioned receiver wallet. Both formats can be
    mixed.
    """
    return await CdpResourceServer.create(config)


__all__ = [
    "CDP_SERVER_DEFAULT_EVM_NETWORKS",
    "CDP_SERVER_DEFAULT_NETWORKS",
    "CDP_SERVER_DEFAULT_SVM_NETWORKS",
    "CdpPaymentScheme",
    "CdpResourceServer",
    "CdpResourceServerConfig",
    "CdpRouteConfig",
    "CdpSchemeRegistration",
    "create_cdp_resource_server",
    "get_cdp_default_schemes",
]
