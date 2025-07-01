from typing import Literal

from pydantic import BaseModel

from cdp.actions.evm.fund.types import FundOperationResult
from cdp.actions.evm.fund.util import format_units
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.create_payment_transfer_quote_request import (
    CreatePaymentTransferQuoteRequest,
)
from cdp.openapi_client.models.crypto_rail_address import CryptoRailAddress
from cdp.openapi_client.models.payment_method_request import PaymentMethodRequest
from cdp.openapi_client.models.transfer_source import TransferSource
from cdp.openapi_client.models.transfer_target import TransferTarget


class FundOptions(BaseModel):
    """The options for funding an EVM account."""

    # The network to fund the account on
    network: Literal["base", "ethereum"]

    # The amount of the token to fund
    amount: int

    # The token to fund
    token: Literal["eth", "usdc"]


async def fund(
    api_clients: ApiClients,
    address: str,
    fund_options: FundOptions,
) -> FundOperationResult:
    """Fund an EVM account."""
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

    decimals = 18 if fund_options.token == "eth" else 6
    amount = format_units(fund_options.amount, decimals)

    create_payment_transfer_request = CreatePaymentTransferQuoteRequest(
        source_type="payment_method",
        source=TransferSource(PaymentMethodRequest(id=card_payment_method.id)),
        target_type="crypto_rail",
        target=TransferTarget(
            CryptoRailAddress(
                currency=fund_options.token, network=fund_options.network, address=address
            )
        ),
        amount=amount,
        currency=fund_options.token,
        execute=True,
    )

    response = await api_clients.payments.create_payment_transfer_quote(
        create_payment_transfer_quote_request=create_payment_transfer_request,
    )

    return FundOperationResult(
        id=response.transfer.id,
        network=response.transfer.target.actual_instance.network,
        target_amount=response.transfer.target_amount,
        target_currency=response.transfer.target_currency,
        status=response.transfer.status,
        transaction_hash=response.transfer.transaction_hash,
    )
