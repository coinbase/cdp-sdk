import pytest

from cdp.openapi_client.models.list_solana_token_balances200_response import (
    ListSolanaTokenBalances200Response,
)
from cdp.openapi_client.models.solana_token import SolanaToken
from cdp.openapi_client.models.solana_token_amount import SolanaTokenAmount
from cdp.openapi_client.models.solana_token_balance import SolanaTokenBalance


@pytest.fixture
def solana_token_balances_model_factory():
    """Create and return a factory for ListSolanaTokenBalances200Response fixtures."""

    def _create_token_balances_model(
        next_page_token="next-page-token",
        balances=None,
    ):
        if balances is None:
            token = SolanaToken(
                mint_address="So11111111111111111111111111111111111111111",
                symbol="TEST",
                name="Test Token",
            )
            amount = SolanaTokenAmount(amount="1000000000", decimals=9)
            balances = [SolanaTokenBalance(token=token, amount=amount)]

        return ListSolanaTokenBalances200Response(
            next_page_token=next_page_token, balances=balances
        )

    return _create_token_balances_model
