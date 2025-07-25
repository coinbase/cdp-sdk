from typing import Literal

from pydantic import BaseModel

from cdp.actions.quote import SolanaQuote
from cdp.actions.util import format_units
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.create_payment_transfer_quote_request import (
    CreatePaymentTransferQuoteRequest,
)
from cdp.openapi_client.models.crypto_rail_address import CryptoRailAddress
from cdp.openapi_client.models.payment_method_request import PaymentMethodRequest
from cdp.openapi_client.models.transfer_source import TransferSource
from cdp.openapi_client.models.transfer_target import TransferTarget


class SolanaQuoteFundOptions(BaseModel):
    """The options for getting a quote to fund a Solana account."""

    # The amount of the token to fund
    amount: int

    # The token to fund
    token: Literal["sol", "usdc"]


async def quote_fund(
    api_clients: ApiClients,
    address: str,
    quote_fund_options: SolanaQuoteFundOptions,
) -> SolanaQuote:
    """Get a quote to fund a Solana account."""
    payment_methods = await api_clients.payments.get_payment_methods()

    card_payment_method = next(
        (
            method
            for method in payment_methods
            if method.type == "card" and "source" in method.actions
        ),
        None,
    )

    if not card_payment_method:
        raise ValueError("No card found to fund account")

    decimals = 9 if quote_fund_options.token == "sol" else 6
    amount = format_units(quote_fund_options.amount, decimals)

    create_payment_transfer_quote_request = CreatePaymentTransferQuoteRequest(
        source_type="payment_method",
        source=TransferSource(PaymentMethodRequest(id=card_payment_method.id)),
        target_type="crypto_rail",
        target=TransferTarget(
            CryptoRailAddress(
                currency=quote_fund_options.token,
                network="solana",
                address=address,
            )
        ),
        amount=amount,
        currency=quote_fund_options.token,
    )

    response = await api_clients.payments.create_payment_transfer_quote(
        create_payment_transfer_quote_request=create_payment_transfer_quote_request,
    )
    transfer = response.transfer

    return SolanaQuote(
        api_clients=api_clients,
        quote_id=transfer.id,
        network="solana",
        fiat_amount=transfer.source_amount,
        fiat_currency=transfer.source_currency,
        token_amount=transfer.target_amount,
        token=transfer.target_currency,
        fees=transfer.fees,
    )
