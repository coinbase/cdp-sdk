"""CDP EVM account to x402 signer adapter.

Bridges :class:`cdp.EvmServerAccount` (which uses an async signing API) to
the synchronous :class:`~x402.mechanisms.evm.exact.client.ClientEvmSigner`
protocol expected by :class:`~x402.mechanisms.evm.exact.ExactEvmScheme`.

The adapter delegates to :class:`cdp.EvmLocalAccount`, which internally uses
a synchronous urllib3-based HTTP client so async ↔ sync bridging is not
needed.
"""

from __future__ import annotations

from typing import Any

from cdp_x402.core.wallets._domain_utils import normalize_domain, normalize_types


class CdpEvmSigner:
    """x402-compatible EVM signer backed by a CDP server wallet.

    Wraps :class:`cdp.EvmLocalAccount` to provide the synchronous
    ``sign_typed_data`` interface expected by
    :class:`~x402.mechanisms.evm.exact.ExactEvmScheme`.
    """

    def __init__(self, local_account: Any) -> None:
        """Initialise with a :class:`cdp.EvmLocalAccount` instance.

        :param local_account: A ``cdp.EvmLocalAccount`` wrapping the CDP
            server account.  Obtain one via
            ``cdp.to_evm_delegated_account(server_account)`` or directly via
            ``cdp.EvmLocalAccount(server_account)``.
        """
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
        """Sign EIP-712 typed data synchronously via the CDP signing API.

        Mirrors the encoding used by
        :class:`~x402.mechanisms.evm.signers.EthAccountSigner` — converts the
        x402 :class:`~x402.mechanisms.evm.types.TypedDataDomain` to a
        camelCase dict and delegates to
        :meth:`cdp.EvmLocalAccount.sign_typed_data`.

        :returns: 65-byte ECDSA signature (r, s, v).
        """
        # x402 TypedDataDomain uses snake_case; EIP-712 / eth_account expect camelCase.
        domain_dict = normalize_domain(domain)
        types_dict = normalize_types(types)

        # Pass full_message so CDP does not infer primaryType from dict key order.
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


def from_cdp_evm_account(server_account: Any) -> CdpEvmSigner:
    """Convert a CDP EVM server account to an x402-compatible signer.

    :param server_account: A :class:`cdp.EvmServerAccount` obtained from
        ``cdp_client.evm.get_or_create_account()``.
    :returns: A :class:`CdpEvmSigner` ready for use with
        :func:`~x402.mechanisms.evm.exact.register_exact_evm_client`.

    Example::

        account = await cdp_client.evm.get_or_create_account(name="my-wallet")
        signer = from_cdp_evm_account(account)
    """
    from cdp import EvmLocalAccount

    local_account = EvmLocalAccount(server_account)
    return CdpEvmSigner(local_account)
