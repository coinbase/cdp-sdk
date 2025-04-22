from cdp.evm_token_balances import (
    EvmToken,
    EvmTokenAmount,
    EvmTokenBalance,
    ListTokenBalancesResult,
)
from cdp.openapi_client.models.list_evm_token_balances_network import ListEvmTokenBalancesNetwork


def test_evm_token():
    """Test the EvmToken class."""
    # Test ERC-20 token
    erc20_token = EvmToken(
        contract_address="0x1234567890123456789012345678901234567890",
        network=ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA,
        symbol="TEST",
        name="Test Token",
    )
    assert erc20_token.contract_address == "0x1234567890123456789012345678901234567890"
    assert erc20_token.network == ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA
    assert erc20_token.symbol == "TEST"
    assert erc20_token.name == "Test Token"

    # Test native token (ETH)
    eth_token = EvmToken(
        contract_address="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        network=ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA,
        symbol="ETH",
        name="Ether",
    )
    assert eth_token.contract_address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    assert eth_token.network == ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA
    assert eth_token.symbol == "ETH"
    assert eth_token.name == "Ether"

    # Test token without optional fields
    minimal_token = EvmToken(
        contract_address="0x1234567890123456789012345678901234567890",
        network=ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA,
    )
    assert minimal_token.contract_address == "0x1234567890123456789012345678901234567890"
    assert minimal_token.network == ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA
    assert minimal_token.symbol is None
    assert minimal_token.name is None


def test_evm_token_amount():
    """Test the EvmTokenAmount class."""
    token_amount = EvmTokenAmount(amount=1000000000000000000, decimals=18)
    assert token_amount.amount == 1000000000000000000
    assert token_amount.decimals == 18

    # Test with different decimals
    usdc_amount = EvmTokenAmount(amount=1000000, decimals=6)
    assert usdc_amount.amount == 1000000
    assert usdc_amount.decimals == 6


def test_evm_token_balance():
    """Test the EvmTokenBalance class."""
    token = EvmToken(
        contract_address="0x1234567890123456789012345678901234567890",
        network=ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA,
        symbol="TEST",
        name="Test Token",
    )
    amount = EvmTokenAmount(amount=1000000000000000000, decimals=18)

    token_balance = EvmTokenBalance(token=token, amount=amount)
    assert token_balance.token == token
    assert token_balance.amount == amount


def test_list_token_balances_result():
    """Test the ListTokenBalancesResult class."""
    # Create some test balances
    token1 = EvmToken(
        contract_address="0x1234567890123456789012345678901234567890",
        network=ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA,
        symbol="TEST1",
    )
    amount1 = EvmTokenAmount(amount=1000000000000000000, decimals=18)
    balance1 = EvmTokenBalance(token=token1, amount=amount1)

    token2 = EvmToken(
        contract_address="0x2345678901234567890123456789012345678901",
        network=ListEvmTokenBalancesNetwork.BASE_MINUS_SEPOLIA,
        symbol="TEST2",
    )
    amount2 = EvmTokenAmount(amount=2000000000000000000, decimals=18)
    balance2 = EvmTokenBalance(token=token2, amount=amount2)

    # Test with next page token
    result_with_next = ListTokenBalancesResult(
        balances=[balance1, balance2],
        next_page_token="next-page-token",
    )
    assert len(result_with_next.balances) == 2
    assert result_with_next.balances[0] == balance1
    assert result_with_next.balances[1] == balance2
    assert result_with_next.next_page_token == "next-page-token"

    # Test without next page token
    result_without_next = ListTokenBalancesResult(
        balances=[balance1, balance2],
    )
    assert len(result_without_next.balances) == 2
    assert result_without_next.balances[0] == balance1
    assert result_without_next.balances[1] == balance2
    assert result_without_next.next_page_token is None

    # Test empty balances list
    empty_result = ListTokenBalancesResult(balances=[])
    assert len(empty_result.balances) == 0
    assert empty_result.next_page_token is None
