"""CDP-powered x402 payment client.

Provides a streamlined setup experience for making paid HTTP requests using
CDP wallets (Server Wallets or Smart Contract Wallets) and the CDP hosted
facilitator.

The easiest path is :class:`CDPx402Client` — a drop-in replacement for
``x402Client`` that initializes lazily on the first payment, reading all
configuration from environment variables::

    from cdp.x402 import CDPx402Client
    from x402.http.clients.httpx import x402AsyncTransport
    import httpx

    client = CDPx402Client()
    transport = x402AsyncTransport(client)
    async with httpx.AsyncClient(transport=transport) as http:
        response = await http.get("https://api.example.com/paid-endpoint")

For explicit control, use :func:`create_cdp_x402_client`::

    client_result = await create_cdp_x402_client(
        CDPx402ClientConfig(wallet_config=WalletConfig(account_name="my-wallet"))
    )
    client = client_result.client

For a Smart Contract Wallet::

    client_result = await create_cdp_x402_client(
        CDPx402ClientConfig(
            wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
        )
    )
    print(f"Smart wallet: {client_result.evm_address}")
    print(f"Owner wallet: {client_result.owner_wallet}")
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass as std_dataclass
from dataclasses import field
from typing import TYPE_CHECKING, Any

from cdp import CdpClient
from pydantic import ConfigDict, field_validator
from pydantic.dataclasses import dataclass
from x402.client import x402Client
from x402.mechanisms.evm.exact import register_exact_evm_client

from cdp.x402.core.balance_check import create_balance_check_hook
from cdp.x402.core.credentials import resolve_credentials
from cdp.x402.core.guardrails.types import SpendControls
from cdp.x402.core.wallets.config import WalletConfig, resolve_wallet_config
from cdp.x402.core.wallets.evm_signer import CDPEVMSigner, from_cdp_evm_account
from cdp.x402.core.wallets.scw_signer import CDPSmartWalletSigner, from_cdp_smart_wallet

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from cdp.x402.core.guardrails.apply import ResolvedSpendControls
else:
    ResolvedSpendControls = Any


@dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class CDPx402ClientConfig:
    """Configuration options for the CDP x402 client.

    All credential fields fall back to environment variables when omitted.
    Explicit values always take precedence.
    """

    api_key_id: str | None = None
    """CDP API key ID. Falls back to ``CDP_API_KEY_ID`` env var."""

    api_key_secret: str | None = None
    """CDP API key secret. Falls back to ``CDP_API_KEY_SECRET`` env var."""

    wallet_secret: str | None = None
    """CDP wallet secret for signing operations. Falls back to
    ``CDP_WALLET_SECRET`` env var.
    """

    wallet_config: WalletConfig | None = None
    """Wallet configuration. Defaults to a CDP Server Wallet (EOA).
    Individual fields fall back to environment variables when omitted.
    """

    spend_controls: SpendControls | None = None
    """Optional SDK-managed spend controls.

    When set, the client wires per-payment caps, cumulative caps with rolling
    windows, allow-lists for networks / assets / payees, and an
    ``on_approaching_limit`` notifier on top of the underlying ``x402Client``.
    """

    @field_validator("spend_controls", mode="before")
    @classmethod
    def _coerce_spend_controls(cls, value: Any) -> Any:
        if value is None or isinstance(value, SpendControls):
            return value
        if isinstance(value, dict):
            return SpendControls(**value)
        return value

    disable_preflight_balance_check: bool = False
    """Disable the client-side pre-flight balance check that runs before each
    payment.

    When ``False`` (the default), the client queries the CDP balance API for
    the wallet's holdings of the requested asset on the requested network and
    raises :exc:`~cdp.x402.core.balance_check.InsufficientFundsError` early
    when the balance is below the amount the server requires. Set to ``True``
    to skip the check. Falls back to the
    ``CDP_DISABLE_PREFLIGHT_BALANCE_CHECK=true`` environment variable.
    """

    rpc_urls: dict[str, str] | None = None
    """Override the public JSON-RPC endpoints used for on-chain balance lookups,
    keyed by CAIP-2 network identifier. Entries are merged over the built-in
    defaults from :data:`~cdp.x402.core.constants.CDP_EVM_RPC_URLS` — only
    supply the networks you want to override (e.g. to use a private
    Alchemy / Infura / CDP-authenticated endpoint instead of the free-tier
    public RPC). Explicit values here take precedence over ``CDP_RPC_URLS``.

    Falls back to the ``CDP_RPC_URLS`` environment variable, which must be a
    JSON object mapping CAIP-2 network IDs to URL strings::

        CDP_RPC_URLS='{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}'

    Example::

        config = CDPx402ClientConfig(
            rpc_urls={
                "eip155:8453": "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY",
            }
        )
    """


@std_dataclass
class CDPx402ClientResult:
    """Result from creating a CDP x402 client."""

    client: x402Client
    """Configured ``x402Client`` with EVM scheme registered."""

    cdp_client: CdpClient
    """The underlying :class:`cdp.CdpClient` instance for direct CDP API access."""

    evm_address: str
    """The EVM address used for payments.

    For ``"cdp-smart"`` wallets this is the Smart Contract Wallet address;
    for ``"cdp-eoa"`` it is the server wallet address.
    """

    svm_address: str
    """The Solana account address provisioned alongside the EVM account."""

    owner_wallet: str | None = field(default=None)
    """Owner account name. Only set when ``wallet_config.type`` is ``"cdp-smart"``.

    The owner EOA signs EIP-712 typed data on behalf of the smart account.
    """

    def async_client(self, **httpx_kwargs: Any) -> Any:
        """Return a settlement-aware ``httpx.AsyncClient`` for making paid requests.

        Convenience method that calls
        :func:`~cdp.x402.core.guardrails.wrap_httpx.wrap_httpx_with_payment`
        on :attr:`client`.

        :param httpx_kwargs: Additional keyword arguments forwarded to
            ``httpx.AsyncClient``.
        :returns: An ``httpx.AsyncClient`` configured with a
            settlement-aware transport::

                result = await create_cdp_x402_client()
                async with result.async_client() as http:
                    response = await http.get("https://api.example.com/paid")
        """
        from cdp.x402.core.guardrails.wrap_httpx import wrap_httpx_with_payment

        return wrap_httpx_with_payment(self.client, **httpx_kwargs)


_CDPSignerSetup = tuple[Any, str, str, str | None]
"""(cdp_client, evm_address, svm_address, owner_wallet | None)"""


def _parse_rpc_urls_from_env() -> dict[str, str] | None:
    """Parse the ``CDP_RPC_URLS`` env var into a CAIP-2→URL mapping.

    The env var must be a flat JSON object mapping CAIP-2 network IDs to
    JSON-RPC URL strings, e.g.::

        CDP_RPC_URLS='{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}'

    :raises ValueError: If the env var is set but is not a valid JSON object.
    """
    raw = os.environ.get("CDP_RPC_URLS")
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "CDP_RPC_URLS must be valid JSON, e.g. "
            '\'{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}\''
        ) from exc
    if not isinstance(parsed, dict):
        raise ValueError(
            "CDP_RPC_URLS must be a JSON object mapping CAIP-2 network IDs to URL strings"
        )
    for network, url in parsed.items():
        if not isinstance(url, str):
            raise ValueError(f"CDP_RPC_URLS: value for {network!r} must be a string URL")
    return parsed


async def _setup_cdp_signers(
    client: Any,
    config: CDPx402ClientConfig | None,
    wallet_config: Any,
) -> _CDPSignerSetup:
    """Provision CDP accounts, register EVM signer, and return setup tuple.

    Returns ``(cdp_client, evm_address, svm_address, owner_wallet)`` where
    ``owner_wallet`` is non-``None`` only for ``"cdp-smart"`` wallets.
    """
    credentials = resolve_credentials(config)
    cdp_client = CdpClient(
        api_key_id=credentials.api_key_id,
        api_key_secret=credentials.api_key_secret,
        wallet_secret=credentials.wallet_secret,
    )

    svm_account = await cdp_client.solana.get_or_create_account(name=wallet_config.account_name)
    svm_address: str = svm_account.address

    owner_wallet: str | None = None
    evm_signer: CDPSmartWalletSigner | CDPEVMSigner

    if wallet_config.type == "cdp-smart":
        owner_account = await cdp_client.evm.get_or_create_account(
            name=wallet_config.owner_account_name
        )
        smart_account = await _get_or_create_smart_account(
            cdp_client, wallet_config.account_name, owner_account
        )
        evm_address: str = smart_account.address
        owner_wallet = wallet_config.owner_account_name
        evm_signer = from_cdp_smart_wallet(
            smart_account,
            credentials=credentials,
            owner_account_name=wallet_config.owner_account_name,
        )
    else:
        evm_account = await cdp_client.evm.get_or_create_account(name=wallet_config.account_name)
        evm_address = evm_account.address
        evm_signer = from_cdp_evm_account(evm_account)

    register_exact_evm_client(client, evm_signer)

    # Register the balance pre-check before spend controls so a failed check
    # does not cause spend trackers to record an anticipated debit.
    disable_preflight_balance_check = (config and config.disable_preflight_balance_check) or (
        os.environ.get("CDP_DISABLE_PREFLIGHT_BALANCE_CHECK", "").lower() == "true"
    )
    # Explicit config takes precedence over env var; both are merged over defaults.
    resolved_rpc_urls: dict[str, str] | None = {
        **(_parse_rpc_urls_from_env() or {}),
        **(config.rpc_urls if config and config.rpc_urls else {}),
    } or None

    if not disable_preflight_balance_check:
        client.on_before_payment_creation(
            create_balance_check_hook(
                cdp_client=cdp_client,
                evm_address=evm_address,
                svm_address=svm_address,
                rpc_urls=resolved_rpc_urls,
            )
        )

    if config and config.spend_controls:
        try:
            from cdp.x402.core.guardrails.apply import (  # noqa: PLC0415
                apply_spend_controls,
            )
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "Spend controls support is unavailable. "
                "Ensure guardrails dependencies are installed."
            ) from exc
        apply_spend_controls(client, config.spend_controls)

    return cdp_client, evm_address, svm_address, owner_wallet


async def _get_or_create_smart_account(
    cdp_client: Any,
    account_name: str,
    owner_account: Any,
) -> Any:
    """Get or create a smart account, recovering from duplicate-owner errors.

    CDP allows only one smart wallet per owner EOA. If the owner already has
    a smart wallet registered under a different name, this function recovers
    by finding and returning the existing one rather than raising.
    """
    try:
        return await cdp_client.evm.get_or_create_smart_account(
            name=account_name,
            owner=owner_account,
        )
    except Exception as exc:
        # NOTE: This string match is version-dependent and may drift if the CDP
        # SDK changes its error message wording.
        if "Multiple smart wallets with the same owner" not in str(exc):
            raise
        existing = await _find_smart_account_by_owner(cdp_client, owner_account.address)
        if existing is None:
            raise
        return await cdp_client.evm.get_smart_account(
            address=existing.address,
            owner=owner_account,
        )


async def _find_smart_account_by_owner(cdp_client: Any, owner_address: str) -> Any:
    """Search all pages of smart accounts for one owned by ``owner_address``."""
    page_token: str | None = None
    while True:
        page = await cdp_client.evm.list_smart_accounts(page_token=page_token)
        for account in page.accounts:
            if (
                account.owners
                and (
                    account.owners[0].address
                    if hasattr(account.owners[0], "address")
                    else str(account.owners[0])
                ).lower()
                == owner_address.lower()
            ):
                return account
        page_token = page.next_page_token
        if not page_token:
            return None


class CDPx402Client:
    """A Coinbase CDP-powered x402 client that initializes lazily on first payment.

    Wraps an ``x402Client`` with automatic wallet provisioning and scheme
    registration. All configuration is read from environment variables by
    default and can be overridden via explicit config. Wallet setup is
    deferred to the first ``create_payment_payload`` call, keeping
    construction synchronous and cheap.

    Wallet type is controlled by ``wallet_config.type`` (or
    ``CDP_WALLET_TYPE`` env var):

    - ``"cdp-eoa"`` (default): CDP Server Wallet
    - ``"cdp-smart"``: CDP Smart Contract Wallet

    Spend controls are wired after the EVM scheme is registered so the
    policy sees all registered networks.

    Example::

        client = CDPx402Client()
        payload = await client.create_payment_payload(payment_required)

    Example with a Smart Contract Wallet::

        client = CDPx402Client(CDPx402ClientConfig(
            wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner"),
        ))
    """

    def __init__(self, config: CDPx402ClientConfig | None = None) -> None:
        self._config = config
        self._inner: x402Client = x402Client()
        self._init_lock: asyncio.Lock = asyncio.Lock()
        self._evm_address: str | None = None
        self._svm_address: str | None = None
        self._owner_wallet: str | None = None
        self._cdp_client: Any = None

    async def _ensure_initialized(self) -> None:
        if self._evm_address is not None:
            return
        async with self._init_lock:
            if self._evm_address is not None:
                return
            await self._initialize()

    async def _initialize(self) -> None:
        wallet_config = resolve_wallet_config(self._config.wallet_config if self._config else None)
        cdp_client, evm_address, svm_address, owner_wallet = await _setup_cdp_signers(
            self._inner, self._config, wallet_config
        )
        self._cdp_client = cdp_client
        self._evm_address = evm_address
        self._svm_address = svm_address
        self._owner_wallet = owner_wallet

    async def create_payment_payload(self, *args: Any, **kwargs: Any) -> Any:
        """Create a payment payload, initializing the CDP wallet on first call.

        Accepts the same arguments as ``x402Client.create_payment_payload``.
        """
        await self._ensure_initialized()
        return await self._inner.create_payment_payload(*args, **kwargs)

    def register_policy(self, policy: Any) -> CDPx402Client:
        """Register a payment policy on the underlying client."""
        self._inner.register_policy(policy)
        return self

    def register(self, network: str, scheme: Any) -> CDPx402Client:
        """Register a V2 scheme client for a network."""
        self._inner.register(network, scheme)
        return self

    def register_v1(self, network: str, scheme: Any) -> CDPx402Client:
        """Register a V1 scheme client for a network."""
        self._inner.register_v1(network, scheme)
        return self

    def on_before_payment_creation(self, hook: Any) -> CDPx402Client:
        """Register hook before payment creation."""
        self._inner.on_before_payment_creation(hook)
        return self

    def on_after_payment_creation(self, hook: Any) -> CDPx402Client:
        """Register hook after successful payment creation."""
        self._inner.on_after_payment_creation(hook)
        return self

    def on_payment_creation_failure(self, hook: Any) -> CDPx402Client:
        """Register hook on payment creation failure."""
        self._inner.on_payment_creation_failure(hook)
        return self

    def get_registered_schemes(self) -> dict[int, list[dict[str, str]]]:
        """Expose registered schemes for debugging/introspection."""
        return self._inner.get_registered_schemes()

    @property
    def evm_address(self) -> str | None:
        """The EVM wallet address, available after the first payment."""
        return self._evm_address

    @property
    def svm_address(self) -> str | None:
        """The Solana wallet address, available after the first payment."""
        return self._svm_address

    @property
    def owner_wallet(self) -> str | None:
        """The owner account name for Smart Contract Wallets, else ``None``."""
        return self._owner_wallet

    @property
    def cdp_client(self) -> Any:
        """The underlying CDP client, available after the first payment."""
        return self._cdp_client

    def async_client(self, **httpx_kwargs: Any) -> Any:
        """Return a settlement-aware ``httpx.AsyncClient`` for making paid requests.

        The returned client automatically handles 402 responses, creates
        payment payloads, and confirms or rolls back the provisional spend
        record based on the server's ``PAYMENT-RESPONSE`` header — ensuring
        spend controls reflect only payments that actually settled on-chain.

        :param httpx_kwargs: Additional keyword arguments forwarded to
            ``httpx.AsyncClient`` (e.g. ``timeout``, ``headers``).
        :returns: An ``httpx.AsyncClient`` configured with a
            settlement-aware transport.  Intended for use as a context manager::

                async with client.async_client() as http:
                    response = await http.get("https://api.example.com/paid")
        """
        from cdp.x402.core.guardrails.wrap_httpx import wrap_httpx_with_payment

        return wrap_httpx_with_payment(self, **httpx_kwargs)


async def create_cdp_x402_client(
    config: CDPx402ClientConfig | None = None,
) -> CDPx402ClientResult:
    """Create a fully configured CDP x402 client, eagerly provisioning wallets.

    Use this when you need the wallet address before making any payments
    (e.g. to fund the wallet first). For most use cases, prefer
    :class:`CDPx402Client` which defers initialization to the first payment.

    :param config: Optional configuration. All fields fall back to env vars.
    :returns: A :class:`CDPx402ClientResult` with the configured client and
        wallet addresses.

    Example (EOA, default)::

        result = await create_cdp_x402_client()
        print(f"Paying from {result.evm_address}")

    Example (Smart Contract Wallet)::

        result = await create_cdp_x402_client(
            CDPx402ClientConfig(
                wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
            )
        )
        print(f"Smart wallet: {result.evm_address}")
        print(f"Owner wallet: {result.owner_wallet}")
    """
    wallet_config = resolve_wallet_config(config.wallet_config if config else None)
    inner = x402Client()
    cdp_client, evm_address, svm_address, owner_wallet = await _setup_cdp_signers(
        inner, config, wallet_config
    )

    return CDPx402ClientResult(
        client=inner,
        cdp_client=cdp_client,
        evm_address=evm_address,
        svm_address=svm_address,
        owner_wallet=owner_wallet,
    )
