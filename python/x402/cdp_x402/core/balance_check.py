"""Client-side pre-flight balance check.

Wires a ``BeforePaymentCreationHook`` that queries the configured CDP wallet's
token balance for the requested asset/network and fails fast with a clear
:exc:`InsufficientFundsError` when the balance is below the amount the server
is asking for.

Without this check, an unfunded wallet submits a signed payment that the
facilitator/verifier rejects with a generic
``invalidReason: invalid_payload`` + ``execution reverted`` message, which is
not actionable. This pre-check converts that into a typed error before any
signing occurs.

Balance lookup is best-effort and is silently skipped when:

- the requested network is not supported.
  EVM coverage: ``base`` and ``base-sepolia`` use the CDP indexed
  token-balance API; ``polygon``, ``arbitrum``, ``world``, and
  ``world-sepolia`` fall back to a direct on-chain ``balanceOf`` call via
  the public RPC endpoint from :data:`~cdp_x402.core.constants.CDP_EVM_RPC_URLS`.
  SVM coverage is ``solana`` and ``solana-devnet``.
- the requested asset contract / mint is not present in the returned token
  balances (e.g. a brand-new ERC-20 the CDP indexer has not seen yet), or
- the balance call itself fails (network blip, auth issue) — the original
  downstream error path is preserved.
"""

from __future__ import annotations

from collections.abc import Callable, Coroutine
from typing import TYPE_CHECKING, Any

from web3 import AsyncWeb3
from web3.providers import AsyncHTTPProvider

from cdp_x402.core.constants import (
    BASE_MAINNET_CAIP2,
    BASE_SEPOLIA_CAIP2,
    CDP_EVM_RPC_URLS,
    SOLANA_DEVNET_CAIP2,
    SOLANA_MAINNET_CAIP2,
)
from cdp_x402.core.guardrails.normalize import normalize_asset
from cdp_x402.core.utils import default_warn, read_required_atomic

if TYPE_CHECKING:
    from cdp import CdpClient

# ---------------------------------------------------------------------------
# Network maps — only networks the CDP balance APIs support today
# ---------------------------------------------------------------------------

# CAIP-2 → CDP indexed balance API network slug.
# The CDP list_token_balances API only supports a subset of networks; for the
# remaining CDP facilitator EVM networks we fall back to a direct on-chain
# balanceOf call using CDP_EVM_RPC_URLS.
_CAIP_TO_CDP_EVM_NETWORK: dict[str, str] = {
    BASE_MAINNET_CAIP2: "base",
    BASE_SEPOLIA_CAIP2: "base-sepolia",
}

# CAIP-2 → CDP Solana balance API network string.
_CAIP_TO_CDP_SVM_NETWORK: dict[str, str] = {
    SOLANA_MAINNET_CAIP2: "solana",
    SOLANA_DEVNET_CAIP2: "solana-devnet",
}


# ---------------------------------------------------------------------------
# Error
# ---------------------------------------------------------------------------


class InsufficientFundsError(Exception):
    """Raised when the wallet's balance is below the required payment amount.

    The ``code`` is fixed to ``"insufficient_funds"`` so callers can branch on
    it regardless of the human-readable message.
    """

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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_evm_balance(
    cdp_client: Any,
    address: str,
    network: str,
    asset: str,
) -> int:
    """Return the EVM token balance for ``asset`` at ``address``.

    Paginates through CDP indexed balances and returns on the first matching
    entry. Returns ``0`` when the asset is absent (i.e. the wallet holds no
    tokens of that type).
    """
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
    """Query an ERC-20 ``balanceOf`` on-chain via ``AsyncWeb3``.

    Used for CDP facilitator EVM networks that are not covered by the CDP
    indexed token-balance API (Polygon, Arbitrum, World, World Sepolia).

    :param rpc_url: Public JSON-RPC endpoint for the target network.
    :param token_address: ERC-20 contract address.
    :param wallet_address: Wallet address to check the balance of.
    :returns: Token balance in atomic units.
    """
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
    """Return the Solana token balance for ``asset`` at ``address``.

    Paginates through CDP indexed balances and returns on the first matching
    entry. Returns ``0`` when the asset is absent.
    """
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


# ---------------------------------------------------------------------------
# Hook factory
# ---------------------------------------------------------------------------

_WarnFn = Callable[[str, object | None], None]


def create_balance_check_hook(
    *,
    cdp_client: CdpClient,
    evm_address: str,
    svm_address: str,
    on_warning: _WarnFn | None = None,
    rpc_urls: dict[str, str] | None = None,
) -> Callable[[Any], Coroutine[Any, Any, None]]:
    """Build a ``BeforePaymentCreationHook`` that performs a pre-flight balance check.

    The hook is intentionally lenient: any condition under which the check
    cannot be performed (unsupported network, missing token in balances, API
    error) is treated as a pass so legitimate payments are never blocked on
    pre-check noise.

    :param cdp_client: Authenticated :class:`cdp.CdpClient` instance.
    :param evm_address: The EVM wallet address to check balances against.
    :param svm_address: The Solana wallet address to check balances against.
    :param on_warning: Optional callable ``(message, cause)`` for skipped-check
        diagnostics. Defaults to :mod:`logging` at WARNING level.
    :param rpc_urls: Optional mapping of CAIP-2 network identifier to
        JSON-RPC endpoint URL. Entries are merged over the built-in
        :data:`~cdp_x402.core.constants.CDP_EVM_RPC_URLS` defaults — only
        supply the networks you want to override (e.g. to use a private
        Alchemy / Infura endpoint instead of the free-tier public RPC).
    :returns: An async before-payment-creation hook.
    """
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
