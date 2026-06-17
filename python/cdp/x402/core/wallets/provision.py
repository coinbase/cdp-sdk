"""CDP receiver-account provisioning for :class:`CDPResourceServer`."""

from __future__ import annotations

from contextlib import suppress
from dataclasses import dataclass
from typing import TYPE_CHECKING, cast

from cdp import CdpClient
from cdp.errors import SmartAccountAlreadyExistsError

from cdp.x402.core.credentials import resolve_credentials

if TYPE_CHECKING:
    from cdp.x402.core.client import CDPx402ClientConfig
    from cdp.x402.core.wallets.config import ResolvedWalletConfig


@dataclass
class CDPAccountProvisionResult:
    """Addresses provisioned for a CDP-backed receiver wallet."""

    cdp_client: CdpClient
    evm_address: str
    svm_address: str
    owner_wallet: str | None = None


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
    config: CDPx402ClientConfig | None,
    wallet_config: ResolvedWalletConfig,
) -> CDPAccountProvisionResult:
    """Provision CDP EVM and Solana receiver accounts for ``payTo``."""
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
            except SmartAccountAlreadyExistsError:
                existing_address = await _find_smart_account_by_owner(
                    cdp_client, owner_account.address
                )
                if existing_address is None:
                    raise RuntimeError(
                        f"Owner account {owner_account.address!r} already has a smart wallet "
                        "registered under a different name, but it could not be located via "
                        "list_smart_accounts. Verify the CDP project credentials have "
                        "permission to list smart accounts."
                    )
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

        return CDPAccountProvisionResult(
            cdp_client=cdp_client,
            evm_address=evm_address,
            svm_address=svm_address,
            owner_wallet=owner_wallet,
        )
    except Exception:
        with suppress(Exception):
            await cdp_client.close()
        raise


__all__ = ["CDPAccountProvisionResult", "provision_cdp_accounts"]
