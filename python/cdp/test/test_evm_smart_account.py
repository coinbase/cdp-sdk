
from unittest.mock import AsyncMock

import pytest

from cdp.evm_smart_account import EvmSmartAccount
from cdp.evm_token_balances import (
    EvmToken,
    EvmTokenAmount,
    EvmTokenBalance,
    ListTokenBalancesResult,
)


class TestEvmSmartAccount:
    """Test suite for the EvmSmartAccount class."""

    def test_init(self, local_account_factory):
        """Test the initialization of the EvmSmartAccount class."""
        address = "0x1234567890123456789012345678901234567890"
        name = "some-name"
        owner = local_account_factory()
        smart_account = EvmSmartAccount(address, owner, name)
        assert smart_account.address == address
        assert smart_account.owners == [owner]
        assert smart_account.name == name

        account_no_name = EvmSmartAccount(address, owner)
        assert account_no_name.address == address
        assert account_no_name.owners == [owner]
        assert account_no_name.name is None

    def test_str_representation(self, smart_account_factory):
        """Test the string representation of the EvmSmartAccount."""
        smart_account = smart_account_factory()
        expected_str = f"Smart Account Address: {smart_account.address}"
        assert str(smart_account) == expected_str

    def test_repr_representation(self, smart_account_factory):
        """Test the repr representation of the EvmSmartAccount."""
        smart_account = smart_account_factory()
        expected_repr = f"Smart Account Address: {smart_account.address}"
        assert repr(smart_account) == expected_repr

    def test_to_evm_smart_account_classmethod(self, smart_account_factory):
        """Test the to_evm_smart_account class method."""
        smart_account = smart_account_factory()
        address = "0x1234567890123456789012345678901234567890"
        name = "Test Smart Account"

        # Test with name
        account = EvmSmartAccount.to_evm_smart_account(address, smart_account.owners[0], name)
        assert isinstance(account, EvmSmartAccount)
        assert account.address == address
        assert account.owners == smart_account.owners
        assert account.name == name

        # Test without name
        account_no_name = EvmSmartAccount.to_evm_smart_account(address, smart_account.owners[0])
        assert isinstance(account_no_name, EvmSmartAccount)
        assert account_no_name.address == address
        assert account_no_name.owners == smart_account.owners
        assert account_no_name.name is None


@pytest.mark.asyncio
async def test_list_token_balances(smart_account_factory, evm_token_balances_model_factory):
    """Test list_token_balances method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)

    mock_evm_token_balances_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_token_balances = mock_evm_token_balances_api

    mock_token_balances = evm_token_balances_model_factory()

    mock_evm_token_balances_api.list_evm_token_balances = AsyncMock(
        return_value=mock_token_balances
    )

    expected_result = ListTokenBalancesResult(
        balances=[
            EvmTokenBalance(
                token=EvmToken(
                    contract_address="0x1234567890123456789012345678901234567890",
                    network="base-sepolia",
                    symbol="TEST",
                    name="Test Token",
                ),
                amount=EvmTokenAmount(amount=1000000000000000000, decimals=18),
            ),
        ],
        next_page_token="next-page-token",
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, mock_api_clients)

    result = await smart_account.list_token_balances(network="base-sepolia")

    mock_evm_token_balances_api.list_evm_token_balances.assert_called_once_with(
        address=address, network="base-sepolia", page_size=None, page_token=None
    )

    assert result == expected_result
