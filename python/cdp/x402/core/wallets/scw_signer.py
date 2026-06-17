"""CDP Smart Contract Wallet (SCW) adapter for x402 EVM signers."""

from __future__ import annotations

import asyncio
import concurrent.futures
import threading
from typing import Any, Protocol, cast

from cdp.x402.core.wallets._domain_utils import normalize_domain, normalize_types


class _CredentialsLike(Protocol):
    api_key_id: str
    api_key_secret: str
    wallet_secret: str


_EXECUTOR: concurrent.futures.ThreadPoolExecutor | None = None
_EXECUTOR_LOCK = threading.Lock()


def _get_executor() -> concurrent.futures.ThreadPoolExecutor:
    global _EXECUTOR
    if _EXECUTOR is None:
        with _EXECUTOR_LOCK:
            if _EXECUTOR is None:
                _EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    return _EXECUTOR


def _run_coroutine_sync(coro: Any) -> Any:
    """Run an async coroutine from a sync context."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    future = _get_executor().submit(asyncio.run, coro)
    return future.result()


def resolve_network_from_chain_id(chain_id: int | None) -> str:
    """Resolve a CDP SDK network name from an EIP-712 domain chain ID."""
    from cdp.x402.core.constants import CHAIN_ID_TO_CDP_NETWORK

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


class CDPSmartWalletSigner:
    """x402-compatible EVM signer backed by a CDP Smart Contract Wallet."""

    def __init__(
        self,
        smart_account: Any,
        credentials: _CredentialsLike | None = None,
        owner_account_name: str | None = None,
    ) -> None:
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
        """Sign EIP-712 typed data via the CDP Smart Contract Wallet."""
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
) -> CDPSmartWalletSigner:
    """Convert a CDP Smart Account to an x402-compatible EVM signer."""
    return CDPSmartWalletSigner(smart_account, credentials, owner_account_name)
