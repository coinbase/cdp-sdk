"""CDP receiver-account provisioning for :class:`CdpResourceServer`.

The resource server only needs *addresses* to populate ``payTo`` on protected
routes — it never signs payments — so this module deliberately omits client
signers. For client-side wallet provisioning (which also wires signers), see
:func:`cdp_x402.core.client._setup_cdp_signers`.
"""

from __future__ import annotations

from contextlib import suppress
from dataclasses import dataclass
from typing import TYPE_CHECKING, cast

from cdp import CdpClient

from cdp_x402.core.credentials import resolve_credentials

if TYPE_CHECKING:
    from cdp_x402.core.client import CdpX402ClientConfig
    from cdp_x402.core.wallets.config import ResolvedWalletConfig


@dataclass
class CdpAccountProvisionResult:
    """Addresses provisioned for a CDP-backed receiver wallet."""

    cdp_client: CdpClient
    """The underlying :class:`cdp.CdpClient` for direct CDP API access."""

    evm_address: str
    """EVM address for the provisioned account (EOA or SCW per ``walletConfig``)."""

    svm_address: str
    """Solana account address."""

    owner_wallet: str | None = None
    """Owner account name. Only set when ``walletConfig.type`` is ``"cdp-smart"``."""


def _is_owner_already_has_smart_wallet_error(exc: BaseException) -> bool:
    # NOTE: This string match is version-dependent and may drift if the CDP SDK
    # changes its error message wording. Mirrored from ``client.py``.
    return "Multiple smart wallets with the same owner" in str(exc)


async def _find_smart_account_by_owner(
    cdp_client: CdpClient,
    owner_address: str,
) -> str | None:
    """Search all pages of smart accounts for one owned by ``owner_address``."""
    normalized_owner = owner_address.lower()
    page_token: str | None = None
    while True:
        page = await cdp_client.evm.list_smart_accounts(page_token=page_token)
        for account in page.accounts:
            if not account.owners:
                continue
            owner = account.owners[0]
            owner_address_value = owner if isinstance(owner, str) else owner.address
            if owner_address_value.lower() == normalized_owner:
                return cast(str, account.address)
        page_token = page.next_page_token
        if not page_token:
            return None


async def provision_cdp_accounts(
    config: CdpX402ClientConfig | None,
    wallet_config: ResolvedWalletConfig,
) -> CdpAccountProvisionResult:
    """Provision CDP EVM and Solana receiver accounts for ``payTo``.

    For ``cdp-smart`` wallet types this returns the smart-account address; the
    owner account name is exposed via ``owner_wallet`` so callers can reference
    it directly when needed.

    Recovery: CDP allows only one smart wallet per owner EOA. If the owner
    already has a smart wallet registered under a different name, this function
    finds and reuses the existing one rather than failing.
    """
    credentials = resolve_credentials(config)
    cdp_client = CdpClient(
        api_key_id=credentials.api_key_id,
        api_key_secret=credentials.api_key_secret,
        wallet_secret=credentials.wallet_secret,
    )

    try:
        svm_account = await cdp_client.solana.get_or_create_account(name=wallet_config.account_name)
        svm_address: str = svm_account.address

        evm_address: str
        owner_wallet: str | None = None

        if wallet_config.type == "cdp-smart":
            owner_account = await cdp_client.evm.get_or_create_account(
                name=wallet_config.owner_account_name
            )
            try:
                smart_account = await cdp_client.evm.get_or_create_smart_account(
                    name=wallet_config.account_name,
                    owner=owner_account,
                )
            except Exception as exc:
                if not _is_owner_already_has_smart_wallet_error(exc):
                    raise
                existing_address = await _find_smart_account_by_owner(
                    cdp_client, owner_account.address
                )
                if existing_address is None:
                    raise RuntimeError(
                        f"Owner account {owner_account.address!r} already has a smart wallet "
                        "registered under a different name, but it could not be located via "
                        "list_smart_accounts. Verify the CDP project credentials have "
                        "permission to list smart accounts."
                    ) from exc
                smart_account = await cdp_client.evm.get_smart_account(
                    address=existing_address,
                    owner=owner_account,
                )
            evm_address = smart_account.address
            owner_wallet = wallet_config.owner_account_name
        else:
            evm_account = await cdp_client.evm.get_or_create_account(
                name=wallet_config.account_name
            )
            evm_address = evm_account.address

        return CdpAccountProvisionResult(
            cdp_client=cdp_client,
            evm_address=evm_address,
            svm_address=svm_address,
            owner_wallet=owner_wallet,
        )
    except Exception:
        # On provisioning failure the caller never receives the client handle,
        # so clean up the underlying HTTP session before propagating the error.
        with suppress(Exception):
            await cdp_client.close()
        raise


__all__ = ["CdpAccountProvisionResult", "provision_cdp_accounts"]
