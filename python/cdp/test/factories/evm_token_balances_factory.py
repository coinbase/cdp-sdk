import pytest

from cdp.openapi_client.models.list_evm_token_balances200_response import (
    ListEvmTokenBalances200Response,
)
from cdp.openapi_client.models.list_evm_token_balances_network import ListEvmTokenBalancesNetwork
from cdp.openapi_client.models.token import Token
from cdp.openapi_client.models.token_amount import TokenAmount
from cdp.openapi_client.models.token_balance import TokenBalance


@pytest.fixture
def evm_token_balances_model_factory():
    """Create and return a factory for ListEvmTokenBalances200Response fixtures."""

    def _create_token_balances_model(
        next_page_token="next-page-token",
        balances=None,
    ):
        if balances is None:
            token = Token(
                contract_address="0x1234567890123456789012345678901234567890",
                network=ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA,
                symbol="TEST",
                name="Test Token",
            )
            amount = TokenAmount(amount="1000000000000000000", decimals=18)
            balances = [TokenBalance(token=token, amount=amount)]

        return ListEvmTokenBalances200Response(next_page_token=next_page_token, balances=balances)

    return _create_token_balances_model
