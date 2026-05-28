"""Wallet configuration and signer adapters for CDP-backed x402 clients.

EVM wallets are fully supported (EOA via :func:`from_cdp_evm_account` and
Smart Contract Wallets via :func:`from_cdp_smart_wallet`).

SVM (Solana) support is not yet implemented. The Python x402
``ClientSvmSigner`` protocol requires a ``keypair: Keypair`` property —
a local private-key object — which CDP server accounts cannot provide
since they sign remotely. SVM parity is blocked pending a protocol change
in the x402 Python SDK.
"""

from cdp_x402.core.wallets.config import (
    WalletConfig,
    WalletType,
    resolve_wallet_config,
    resolve_wallet_type,
)
from cdp_x402.core.wallets.evm_signer import CdpEvmSigner, from_cdp_evm_account
from cdp_x402.core.wallets.scw_signer import (
    CdpSmartWalletSigner,
    from_cdp_smart_wallet,
    resolve_network_from_chain_id,
)

__all__ = [
    "WalletConfig",
    "WalletType",
    "resolve_wallet_config",
    "resolve_wallet_type",
    "CdpEvmSigner",
    "from_cdp_evm_account",
    "CdpSmartWalletSigner",
    "from_cdp_smart_wallet",
    "resolve_network_from_chain_id",
]
