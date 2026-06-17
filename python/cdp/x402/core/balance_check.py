"""Client-side pre-flight balance check for x402 payments."""

from __future__ import annotations

from collections.abc import Callable, Coroutine
from typing import TYPE_CHECKING, Any

from web3 import AsyncWeb3
from web3.providers import AsyncHTTPProvider

from cdp.x402.core.constants import (
    BASE_MAINNET_CAIP2,
    BASE_SEPOLIA_CAIP2,
    CDP_EVM_RPC_URLS,
    SOLANA_DEVNET_CAIP2,
    SOLANA_MAINNET_CAIP2,
)
from cdp.x402.core.guardrails.normalize import normalize_asset
from cdp.x402.core.utils import default_warn, read_required_atomic

if TYPE_CHECKING:
    from cdp import CdpClient

_CAIP_TO_CDP_EVM_NETWORK: dict[str, str] = {
    BASE_MAINNET_CAIP2: "base",
    BASE_SEPOLIA_CAIP2: "base-sepolia",
}

_CAIP_TO_CDP_SVM_NETWORK: dict[str, str] = {
    SOLANA_MAINNET_CAIP2: "solana",
    SOLANA_DEVNET_CAIP2: "solana-devnet",
}


class InsufficientFundsError(Exception):
    """Raised when the wallet's balance is below the required payment amount."""

    code: str = "insufficient_funds"

    def __init__(
        self,
        *,
        required: int,
        available: int,
        asset: str,
        network: str,
        address: str,
    ) -> None:
        super().__init__(
            f"Insufficient funds for x402 payment: wallet {address} on {network} has "
            f"{available} of asset {asset}, but {required} is required."
        )
        self.required = required
        self.available = available
        self.asset = asset
        self.network = network
        self.address = address


async def _get_evm_balance(
    cdp_client: Any,
    address: str,
    network: str,
    asset: str,
) -> int:
    page_token: str | None = None
    while True:
        page = await cdp_client.evm.list_token_balances(
            address=address,
            network=network,
            page_token=page_token,
        )
        for entry in page.balances:
            if normalize_asset(entry.token.contract_address) == asset:
                return int(entry.amount.amount)
        page_token = page.next_page_token
        if not page_token:
            break
    return 0


_ERC20_BALANCE_OF_ABI = [
    {
        "name": "balanceOf",
        "type": "function",
        "inputs": [{"name": "owner", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    }
]


async def _read_onchain_erc20_balance(
    rpc_url: str,
    token_address: str,
    wallet_address: str,
) -> int:
    w3 = AsyncWeb3(AsyncHTTPProvider(rpc_url))
    try:
        contract = w3.eth.contract(
            address=AsyncWeb3.to_checksum_address(token_address),
            abi=_ERC20_BALANCE_OF_ABI,
        )
        result: int = await contract.functions.balanceOf(
            AsyncWeb3.to_checksum_address(wallet_address)
        ).call()
        return result
    finally:
        await w3.provider.disconnect()


async def _get_svm_balance(
    cdp_client: Any,
    address: str,
    network: str,
    asset: str,
) -> int:
    page_token: str | None = None
    while True:
        page = await cdp_client.solana.list_token_balances(
            address=address,
            network=network,
            page_token=page_token,
        )
        for entry in page.balances:
            if entry.token.mint_address == asset:
                return int(entry.amount.amount)
        page_token = page.next_page_token
        if not page_token:
            break
    return 0


_WarnFn = Callable[[str, object | None], None]


def create_balance_check_hook(
    *,
    cdp_client: CdpClient,
    evm_address: str,
    svm_address: str,
    on_warning: _WarnFn | None = None,
    rpc_urls: dict[str, str] | None = None,
) -> Callable[[Any], Coroutine[Any, Any, None]]:
    """Build a ``BeforePaymentCreationHook`` that performs a pre-flight balance check."""
    warn = on_warning or default_warn
    resolved_rpc_urls: dict[str, str] = (
        {**CDP_EVM_RPC_URLS, **rpc_urls} if rpc_urls else CDP_EVM_RPC_URLS
    )

    async def hook(context: Any) -> None:
        req = context.selected_requirements
        required = read_required_atomic(req)
        if required is None or required == 0:
            return None

        network: str = req.network if hasattr(req, "network") else ""
        asset: str = req.asset if hasattr(req, "asset") else ""
        normalized_asset = normalize_asset(asset)

        evm_network = _CAIP_TO_CDP_EVM_NETWORK.get(network)
        evm_rpc_url = resolved_rpc_urls.get(network)
        svm_network = _CAIP_TO_CDP_SVM_NETWORK.get(network)

        available: int
        address: str

        asset_label = asset if svm_network else normalized_asset

        try:
            if evm_network:
                address = evm_address
                available = await _get_evm_balance(
                    cdp_client,
                    address=evm_address,
                    network=evm_network,
                    asset=normalized_asset,
                )
            elif evm_rpc_url:
                if not normalized_asset.startswith("0x"):
                    return None
                address = evm_address
                available = await _read_onchain_erc20_balance(
                    evm_rpc_url,
                    token_address=normalized_asset,
                    wallet_address=evm_address,
                )
            elif svm_network:
                address = svm_address
                available = await _get_svm_balance(
                    cdp_client,
                    address=svm_address,
                    network=svm_network,
                    asset=asset,
                )
            else:
                return None
        except Exception as exc:
            warn(
                f"Pre-flight balance check failed for {network} ({asset_label}); "
                "proceeding without check.",
                exc,
            )
            return None

        if available >= required:
            return None

        raise InsufficientFundsError(
            required=required,
            available=available,
            asset=asset,
            network=network,
            address=address,
        )

    return hook
