"""CDP Smart Contract Wallet (SCW) adapter for x402 EVM signers.

Bridges :class:`cdp.EvmSmartAccount` to the synchronous
:class:`~x402.mechanisms.evm.signer.ClientEvmSigner` protocol expected by
:class:`~x402.mechanisms.evm.exact.ExactEvmScheme`.

CDP Smart Accounts use ERC-4337 account abstraction. Their ``sign_typed_data``
method requires a ``network`` parameter to route the request to the correct
chain. This module provides an adapter that maps the EIP-712 domain
``chain_id`` to the corresponding CDP SDK network name, removing the need to
carry chain context through the call stack manually.

Design decisions:

- Chain context is derived automatically from EIP-712 ``domain.chain_id`` so
  callers don't need to pass the network explicitly.
- The adapter is intentionally thin: it does not add replay-protection beyond
  what the underlying CDP smart wallet already provides.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import threading
from typing import Any, Protocol, cast

from cdp_x402.core.wallets._domain_utils import normalize_domain, normalize_types


class _CredentialsLike(Protocol):
    api_key_id: str
    api_key_secret: str
    wallet_secret: str


#: Shared thread pool for running async signing in a worker thread when called
#: from within an active event loop. Created lazily to avoid spawning a thread
#: at import time for callers that never use SCW signing.
_EXECUTOR: concurrent.futures.ThreadPoolExecutor | None = None
_EXECUTOR_LOCK = threading.Lock()


def _get_executor() -> concurrent.futures.ThreadPoolExecutor:
    global _EXECUTOR
    if _EXECUTOR is None:
        with _EXECUTOR_LOCK:
            if _EXECUTOR is None:
                _EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    return _EXECUTOR


#: Maps EIP-155 chain IDs to CDP SDK network names for SCW typed-data signing.
CHAIN_ID_TO_CDP_NETWORK: dict[int, str] = {
    8453: "base",
    84532: "base-sepolia",
    42161: "arbitrum",
    10: "optimism",
    7777777: "zora",
    137: "polygon",
    56: "bnb",
    43114: "avalanche",
    11155111: "ethereum-sepolia",
}


def _run_coroutine_sync(coro: Any) -> Any:
    """Run an async coroutine from a sync context.

    x402's ClientEvmSigner protocol is synchronous, while CDP smart account
    signing is async. This bridge keeps the signer compatible with x402's
    sync API without changing caller contracts.
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        # No running loop in this thread, so we can drive the coroutine directly.
        return asyncio.run(coro)

    # We're inside an active event loop; execute in a worker thread that can
    # own its own loop. Any exception from the coroutine should propagate.
    future = _get_executor().submit(asyncio.run, coro)
    return future.result()


def resolve_network_from_chain_id(chain_id: int | None) -> str:
    """Resolve a CDP SDK network name from an EIP-712 domain chain ID.

    :param chain_id: The chain ID from the EIP-712 domain.
    :returns: The CDP SDK network name (e.g. ``"base-sepolia"``).
    :raises ValueError: If ``chain_id`` is ``None`` or not supported.
    """
    if chain_id is None:
        raise ValueError(
            "Cannot derive CDP network: domain.chain_id is missing from the typed data. "
            "EIP-712 domain must include chain_id when using a Smart Contract Wallet."
        )
    network = CHAIN_ID_TO_CDP_NETWORK.get(chain_id)
    if not network:
        supported = ", ".join(CHAIN_ID_TO_CDP_NETWORK.values())
        raise ValueError(
            f"Unsupported chain_id {chain_id} for CDP Smart Contract Wallet. "
            f"Supported networks: {supported}"
        )
    return network


class CdpSmartWalletSigner:
    """x402-compatible EVM signer backed by a CDP Smart Contract Wallet.

    Wraps a :class:`cdp.EvmSmartAccount` to provide the synchronous
    ``sign_typed_data`` interface expected by
    :class:`~x402.mechanisms.evm.exact.ExactEvmScheme`.

    The ``network`` parameter required by CDP smart accounts is derived
    automatically from the EIP-712 domain's ``chain_id``.
    """

    def __init__(
        self,
        smart_account: Any,
        credentials: _CredentialsLike | None = None,
        owner_account_name: str | None = None,
    ) -> None:
        """Initialise with a :class:`cdp.EvmSmartAccount` instance.

        :param smart_account: A ``cdp.EvmSmartAccount`` obtained from
            ``cdp_client.evm.get_or_create_smart_account()``.
        """
        self._smart_account = smart_account
        self._credentials = credentials
        self._owner_account_name = owner_account_name

    @property
    def address(self) -> str:
        """The signer's Ethereum address (checksummed)."""
        return str(self._smart_account.address)

    def sign_typed_data(
        self,
        domain: Any,
        types: dict[str, list[Any]],
        primary_type: str,
        message: dict[str, Any],
    ) -> bytes:
        """Sign EIP-712 typed data via the CDP Smart Contract Wallet.

        Derives the CDP network from ``domain.chain_id`` and forwards all
        EIP-712 fields plus the resolved ``network`` to the underlying smart
        account's ``sign_typed_data`` method.

        :returns: ECDSA signature bytes.
        :raises ValueError: If ``domain.chain_id`` is missing or unsupported.
        """
        domain_dict = normalize_domain(domain)
        chain_id: int | None = domain_dict.get("chainId") or (
            getattr(domain, "chain_id", None) if not isinstance(domain, dict) else None
        )
        network = resolve_network_from_chain_id(chain_id)

        types_dict = normalize_types(types)

        try:
            signed_hex: str = _run_coroutine_sync(
                self._smart_account.sign_typed_data(
                    domain=domain_dict,
                    types=types_dict,
                    primary_type=primary_type,
                    message=message,
                    network=network,
                )
            )
        except Exception as exc:
            # Some CDP SDK objects are event-loop bound. If sign_typed_data fails
            # due to loop affinity, retry with a fresh CDP client in the same
            # worker loop used for this sync bridge.
            if "different loop" not in str(exc):
                raise
            signed_hex = _run_coroutine_sync(
                self._sign_with_fresh_client(
                    domain=domain_dict,
                    types=types_dict,
                    primary_type=primary_type,
                    message=message,
                    network=network,
                )
            )
        sig_hex = signed_hex.removeprefix("0x")
        return bytes.fromhex(sig_hex)

    async def _sign_with_fresh_client(
        self,
        domain: dict[str, Any],
        types: dict[str, list[dict[str, str]]],
        primary_type: str,
        message: dict[str, Any],
        network: str,
    ) -> str:
        if not self._credentials:
            raise RuntimeError("Smart wallet signer requires credentials for loop fallback")
        if not self._owner_account_name:
            raise RuntimeError("Smart wallet signer requires owner_account_name for loop fallback")

        from cdp import CdpClient

        async with CdpClient(
            api_key_id=self._credentials.api_key_id,
            api_key_secret=self._credentials.api_key_secret,
            wallet_secret=self._credentials.wallet_secret,
        ) as cdp_client:
            owner_account = await cdp_client.evm.get_or_create_account(
                name=self._owner_account_name
            )
            smart_account = await cdp_client.evm.get_smart_account(
                address=self.address,
                owner=owner_account,
            )
            return cast(
                str,
                await smart_account.sign_typed_data(
                    domain=domain,
                    types=types,
                    primary_type=primary_type,
                    message=message,
                    network=network,
                ),
            )


def from_cdp_smart_wallet(
    smart_account: Any,
    credentials: _CredentialsLike | None = None,
    owner_account_name: str | None = None,
) -> CdpSmartWalletSigner:
    """Convert a CDP Smart Account to an x402-compatible EVM signer.

    :param smart_account: A :class:`cdp.EvmSmartAccount` obtained from
        ``cdp_client.evm.get_or_create_smart_account()``.
    :returns: A :class:`CdpSmartWalletSigner` ready for use with
        :func:`~x402.mechanisms.evm.exact.register_exact_evm_client`.

    Example::

        owner = await cdp_client.evm.get_or_create_account(name="my-owner")
        smart_account = await cdp_client.evm.get_or_create_smart_account(
            name="my-scw",
            owner=owner,
        )
        signer = from_cdp_smart_wallet(smart_account)
    """
    return CdpSmartWalletSigner(smart_account, credentials, owner_account_name)
