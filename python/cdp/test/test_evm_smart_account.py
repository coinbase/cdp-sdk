from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.fund.quote import Quote
from cdp.api_clients import ApiClients
from cdp.evm_call_types import FunctionCall
from cdp.evm_smart_account import EvmSmartAccount
from cdp.evm_token_balances import (
    EvmToken,
    EvmTokenAmount,
    EvmTokenBalance,
    ListTokenBalancesResult,
)
from cdp.openapi_client.models.create_payment_transfer_quote201_response import (
    CreatePaymentTransferQuote201Response,
)
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest


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

        policies = ["c12a1144-a579-49da-acd8-fabe66805e32"]
        account_with_policies = EvmSmartAccount(address, owner, name, policies)
        assert account_with_policies.policies == policies

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

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)

    result = await smart_account.list_token_balances(network="base-sepolia")

    mock_evm_token_balances_api.list_evm_token_balances.assert_called_once_with(
        address=address, network="base-sepolia", page_size=None, page_token=None
    )

    assert result == expected_result


@pytest.mark.asyncio
@patch("cdp.actions.evm.send_user_operation.Web3")
@patch("cdp.actions.evm.send_user_operation.ensure_awaitable")
@patch("cdp.cdp_client.ApiClients")
async def test_send_user_operation(
    mock_api_clients,
    mock_ensure_awaitable,
    mock_web3,
    smart_account_model_factory,
    local_account_factory,
):
    """Test send_user_operation method."""
    mock_contract = MagicMock()
    mock_contract.encode_abi.return_value = "0x1234abcd"

    mock_web3_instance = MagicMock()
    mock_web3_instance.eth.contract.return_value = mock_contract
    mock_web3.return_value = mock_web3_instance

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash123"

    mock_signed_payload = MagicMock()
    mock_signed_payload.signature = bytes.fromhex("aabbcc")
    mock_ensure_awaitable.return_value = mock_signed_payload

    mock_api_clients.evm_smart_accounts.prepare_user_operation = AsyncMock(
        return_value=mock_user_op
    )
    mock_api_clients.evm_smart_accounts.send_user_operation = AsyncMock(return_value=mock_user_op)

    smart_account_model = smart_account_model_factory()
    owner = local_account_factory()

    smart_account = EvmSmartAccount(
        smart_account_model.address, owner, smart_account_model.name, None, mock_api_clients
    )

    function_call = FunctionCall(
        to="0x2345678901234567890123456789012345678901",
        abi=[{"name": "transfer", "inputs": [{"type": "address"}, {"type": "uint256"}]}],
        function_name="transfer",
        args=["0x3456789012345678901234567890123456789012", 100],
        value=None,
    )

    result = await smart_account.send_user_operation(
        calls=[function_call],
        network="base-sepolia",
        paymaster_url="https://paymaster.example.com",
    )

    assert result == mock_user_op


@pytest.mark.asyncio
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation(
    mock_api_clients,
    smart_account_model_factory,
    local_account_factory,
):
    """Test wait_for_user_operation method."""
    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash123"
    mock_user_op.status = "complete"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(return_value=mock_user_op)

    smart_account_model = smart_account_model_factory()
    owner = local_account_factory()

    smart_account = EvmSmartAccount(
        smart_account_model.address, owner, smart_account_model.name, None, mock_api_clients
    )

    result = await smart_account.wait_for_user_operation(
        user_op_hash=mock_user_op.user_op_hash,
    )

    assert result == mock_user_op


@pytest.mark.asyncio
@patch("cdp.cdp_client.ApiClients")
async def test_get_user_operation(
    mock_api_clients,
    smart_account_model_factory,
    local_account_factory,
):
    """Test get_user_operation method."""
    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash123"
    mock_user_op.status = "complete"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(return_value=mock_user_op)

    smart_account_model = smart_account_model_factory()
    owner = local_account_factory()

    smart_account = EvmSmartAccount(
        smart_account_model.address, owner, smart_account_model.name, None, mock_api_clients
    )

    result = await smart_account.get_user_operation(
        user_op_hash=mock_user_op.user_op_hash,
    )

    assert result == mock_user_op


@pytest.mark.asyncio
async def test_request_faucet(smart_account_model_factory):
    """Test request_faucet method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account_model = smart_account_model_factory(address, name)

    mock_faucets_api = AsyncMock()
    mock_api_instance = AsyncMock()
    mock_api_instance.faucets = mock_faucets_api

    mock_response = AsyncMock()
    mock_response.transaction_hash = "0x123"
    mock_faucets_api.request_evm_faucet = AsyncMock(return_value=mock_response)
    smart_account = EvmSmartAccount(
        smart_account_model.address,
        smart_account_model.owners[0],
        smart_account_model.name,
        None,
        mock_api_instance,
    )

    result = await smart_account.request_faucet(network="base-sepolia", token="eth")

    mock_faucets_api.request_evm_faucet.assert_called_once_with(
        request_evm_faucet_request=RequestEvmFaucetRequest(
            network="base-sepolia",
            token="eth",
            address=address,
        ),
    )
    assert result == "0x123"


@pytest.mark.asyncio
async def test_quote_fund_transfer_usdc_on_base(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory()
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1 USDC
    result = await smart_account.quote_fund(network="base", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "base"
    assert result.token == "usdc"
    assert result.fiat_amount == "1"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1"
    assert result.token == "usdc"
    assert result.fees == []


@pytest.mark.asyncio
async def test_quote_fund_transfer_eth_on_base(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1.1 ETH
    result = await smart_account.quote_fund(network="base", token="eth", amount=1100000000000000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "base"
    assert result.token == "eth"
    assert result.fiat_amount == "1000"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1.1"
    assert result.token == "eth"
    assert result.fees == []


@pytest.mark.asyncio
async def test_quote_fund_transfer_usdc_on_ethereum(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory()
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1 USDC
    result = await smart_account.quote_fund(network="ethereum", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "ethereum"
    assert result.token == "usdc"
    assert result.fiat_amount == "1"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1"
    assert result.token == "usdc"
    assert result.fees == []


@pytest.mark.asyncio
async def test_quote_fund_transfer_eth_on_ethereum(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1.1 ETH
    result = await smart_account.quote_fund(
        network="ethereum", token="eth", amount=1100000000000000000
    )

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "ethereum"
    assert result.token == "eth"
    assert result.fiat_amount == "1000"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1.1"
    assert result.token == "eth"
    assert result.fees == []


@pytest.mark.asyncio
async def test_fund_transfer_eth_on_base(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1.1 ETH
    result = await smart_account.fund(network="base", token="eth", amount=1100000000000000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_fund_transfer_usdc_on_base(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method with USDC."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1", source_currency="usd", target_amount="1", target_currency="usdc"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1 USDC (6 decimals)
    result = await smart_account.fund(network="base", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_fund_transfer_eth_on_ethereum(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1.1 ETH
    result = await smart_account.fund(network="ethereum", token="eth", amount=1100000000000000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_fund_transfer_usdc_on_ethereum(
    smart_account_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method with USDC."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1", source_currency="usd", target_amount="1", target_currency="usdc"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    # 1 USDC (6 decimals)
    result = await smart_account.fund(network="ethereum", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_success(
    smart_account_factory, payment_transfer_model_factory
):
    """Test wait_for_fund_operation_receipt method with successful completion."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)

    mock_payments_api = AsyncMock()
    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    completed_transfer = payment_transfer_model_factory(status="completed")
    mock_payments_api.get_payment_transfer = AsyncMock(return_value=completed_transfer)

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    result = await smart_account.wait_for_fund_operation_receipt(transfer_id="test-transfer-id")

    assert result == completed_transfer
    mock_payments_api.get_payment_transfer.assert_called_once_with("test-transfer-id")


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_failure(
    smart_account_factory, payment_transfer_model_factory
):
    """Test wait_for_fund_operation_receipt method with failed transfer."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)

    mock_payments_api = AsyncMock()
    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    failed_transfer = payment_transfer_model_factory(status="failed")
    mock_payments_api.get_payment_transfer = AsyncMock(return_value=failed_transfer)

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)
    result = await smart_account.wait_for_fund_operation_receipt(transfer_id="test-transfer-id")

    assert result == failed_transfer
    mock_payments_api.get_payment_transfer.assert_called_once_with("test-transfer-id")


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_timeout(
    smart_account_factory, payment_transfer_model_factory
):
    """Test wait_for_fund_operation_receipt method with timeout."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    smart_account = smart_account_factory(address, name)

    mock_payments_api = AsyncMock()
    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    pending_transfer = payment_transfer_model_factory(status="pending")
    mock_payments_api.get_payment_transfer = AsyncMock(return_value=pending_transfer)

    smart_account = EvmSmartAccount(address, smart_account.owners[0], name, None, mock_api_clients)

    with pytest.raises(TimeoutError):
        await smart_account.wait_for_fund_operation_receipt(
            transfer_id="test-transfer-id", timeout_seconds=0.1, interval_seconds=0.1
        )
