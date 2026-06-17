"""CDP EVM account to x402 signer adapter."""

from __future__ import annotations

from typing import Any

from cdp.x402.core.wallets._domain_utils import normalize_domain, normalize_types


class CDPEVMSigner:
    """x402-compatible EVM signer backed by a CDP server wallet."""

    def __init__(self, local_account: Any) -> None:
        self._local_account = local_account

    @property
    def address(self) -> str:
        """The signer's Ethereum address (checksummed)."""
        return str(self._local_account.address)

    def sign_typed_data(
        self,
        domain: Any,
        types: dict[str, list[Any]],
        primary_type: str,
        message: dict[str, Any],
    ) -> bytes:
        """Sign EIP-712 typed data synchronously via the CDP signing API."""
        domain_dict = normalize_domain(domain)
        types_dict = normalize_types(types)
        full_message = {
            "domain": domain_dict,
            "types": types_dict,
            "primaryType": primary_type,
            "message": message,
        }
        signed = self._local_account.sign_typed_data(
            full_message=full_message,
        )
        return bytes(signed.signature)


def from_cdp_evm_account(server_account: Any) -> CDPEVMSigner:
    """Convert a CDP EVM server account to an x402-compatible signer."""
    from cdp import EvmLocalAccount

    local_account = EvmLocalAccount(server_account)
    return CDPEVMSigner(local_account)
