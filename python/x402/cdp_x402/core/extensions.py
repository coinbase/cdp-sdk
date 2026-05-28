"""CDP-opinionated extension wiring for the x402 payment protocol.

:class:`CdpResourceServer` automatically advertises three extensions on every
route. Gas-sponsoring extensions are static (presence of key is enough); the
Bazaar discovery extension is built per-route from the route key plus any
user-provided overrides.

| Key                              | Notes                                       |
|----------------------------------|---------------------------------------------|
| ``"eip2612GasSponsoring"``       | Sponsored Permit2 via EIP-2612 permit       |
| ``"erc20ApprovalGasSponsoring"`` | Sponsored ERC-20 approve tx                 |
| ``"bazaar"``                     | Per-route discovery metadata for the bazaar |

All three are auto-injected on every route.

Users who need richer Bazaar metadata (queryParams, body example, output
schema, etc.) override by setting ``extensions.bazaar`` on the route — their
value takes precedence over the auto-generated one.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# ---------------------------------------------------------------------------
# Extension key constants
# ---------------------------------------------------------------------------

CDP_EXTENSION_GAS_SPONSORING_EIP2612 = "eip2612GasSponsoring"
"""Extension key for EIP-2612 gas-sponsored Permit2 payments.

When advertised in ``PaymentRequired.extensions`` the x402 EVM client signs an
EIP-2612 permit whenever the Permit2 allowance is insufficient; the CDP
Facilitator submits the permit transaction so the user pays no gas.
"""

CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL = "erc20ApprovalGasSponsoring"
"""Extension key for ERC-20 approval gas-sponsored payments.

When advertised in ``PaymentRequired.extensions`` the x402 EVM client signs an
ERC-20 approval transaction so the user pays no gas.
"""

CDP_EXTENSION_BAZAAR = "bazaar"
"""Extension key for Bazaar resource discovery.

Auto-injected by :class:`CdpResourceServer` with a minimal
``DiscoveryExtension`` built from the route key (HTTP method + path
template). Override by setting ``extensions["bazaar"]`` on the route with
richer metadata.
"""

# Static extension declarations injected into every route. Bazaar is NOT in
# this set — it is built per-route since it requires the HTTP method/path.
CDP_SUPPORTED_EXTENSIONS: dict[str, Any] = {
    CDP_EXTENSION_GAS_SPONSORING_EIP2612: {},
    CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL: {},
}

# Type alias matching the TS ``CdpExtensions``.
CdpExtensions = dict[str, Any]


# ---------------------------------------------------------------------------
# Bazaar discovery declaration builder
# ---------------------------------------------------------------------------

# HTTP methods that carry a request body.
_BODY_METHODS = frozenset({"POST", "PUT", "PATCH"})


def build_bazaar_declaration(method: str, path: str) -> dict[str, Any]:
    """Build a minimal Bazaar ``DiscoveryExtension`` from an HTTP verb and path.

    Wire shape mirrors ``github.com/x402-foundation/x402/go/extensions/bazaar``:

    - ``GET`` / ``HEAD`` / ``DELETE`` → ``QueryInput`` (``{type, method}``)
    - ``POST`` / ``PUT`` / ``PATCH``  → ``BodyInput``  (``{type, method, bodyType: "json"}``)
    """
    is_body_method = method in _BODY_METHODS
    input_obj: dict[str, Any] = {"type": "http", "method": method}
    if is_body_method:
        input_obj["bodyType"] = "json"

    # JSON Schema for the info object. Mirrors createQueryDiscoveryExtension /
    # createBodyDiscoveryExtension in the Go SDK; the CDP Facilitator's
    # ValidateDiscoveryExtension validates info against this schema, so a
    # null/missing schema causes "invalid discovery configuration".
    input_schema_properties: dict[str, Any] = {
        "type": {"type": "string", "const": "http"},
        "method": {"type": "string", "enum": [method]},
    }
    input_schema_required = ["type", "method"]
    if is_body_method:
        input_schema_properties["bodyType"] = {"type": "string", "enum": ["json"]}
        input_schema_required.append("bodyType")

    schema: dict[str, Any] = {
        "properties": {
            "input": {
                "type": "object",
                "properties": input_schema_properties,
                "required": input_schema_required,
                "additionalProperties": False,
            },
        },
    }

    return {
        "info": {"input": input_obj},
        "schema": schema,
        "routeTemplate": path,
    }


# ---------------------------------------------------------------------------
# ResourceServerExtension registrations
# ---------------------------------------------------------------------------


@dataclass
class _PassThroughExtension:
    """Resource server extension that returns ``declaration or {}`` unchanged.

    Implements the :class:`x402.schemas.ResourceServerExtension` Protocol — a
    typing.Protocol with ``key`` and ``enrich_declaration``.
    """

    key: str

    def enrich_declaration(self, declaration: Any, transport_context: Any) -> Any:
        return declaration if declaration is not None else {}


def get_cdp_extension_registrations() -> list[Any]:
    """Return :class:`ResourceServerExtension` registrations for all CDP keys.

    These let routes whose ``extensions`` declare a CDP extension key get the
    correct ``PaymentRequired.extensions[key]`` value at request time. Each
    handler is a no-op for routes that do not declare its key.

    :func:`CdpResourceServer.create` registers these automatically. Call this
    manually only when building an :class:`x402ResourceServer` without
    :class:`CdpResourceServer`.
    """
    registrations: list[Any] = [
        _PassThroughExtension(key=CDP_EXTENSION_GAS_SPONSORING_EIP2612),
        _PassThroughExtension(key=CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL),
    ]
    try:
        # Reuse upstream x402 enrichment for Bazaar interoperability
        # (method injection + dynamic path params handling).
        from x402.extensions.bazaar import bazaar_resource_server_extension
    except ImportError:
        # Keep a lightweight fallback when x402 extension extras are unavailable.
        registrations.append(_PassThroughExtension(key=CDP_EXTENSION_BAZAAR))
    else:
        registrations.append(bazaar_resource_server_extension)
    return registrations


__all__ = [
    "CDP_EXTENSION_BAZAAR",
    "CDP_EXTENSION_GAS_SPONSORING_EIP2612",
    "CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL",
    "CDP_SUPPORTED_EXTENSIONS",
    "CdpExtensions",
    "build_bazaar_declaration",
    "get_cdp_extension_registrations",
]
