from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.api_clients import ApiClients
from cdp.evm_call_types import FunctionCall
from cdp.evm_smart_account import EvmSmartAccount
from cdp.evm_token_balances import (
    EvmToken,
    EvmTokenAmount,
    EvmTokenBalance,
    ListTokenBalancesResult,
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

    mock_onchain_data_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.onchain_data = mock_onchain_data_api

    mock_token_balances = evm_token_balances_model_factory()

    mock_onchain_data_api.list_data_token_balances = AsyncMock(return_value=mock_token_balances)

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

    mock_onchain_data_api.list_data_token_balances.assert_called_once_with(
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
    async def test_sign_typed_data_success(self, smart_account_factory):
        """Test successful signing of typed data."""
        from cdp.evm_message_types import EIP712Domain

        address = "0x1234567890123456789012345678901234567890"
        name = "test-account"
        smart_account = smart_account_factory(address, name)

        # Mock API clients
        mock_api_clients = AsyncMock(spec=ApiClients)
        smart_account = EvmSmartAccount(
            address, smart_account.owners[0], name, None, mock_api_clients
        )

        # Create test domain
        domain = EIP712Domain(
            name="Test Contract",
            version="1",
            chain_id=1,
            verifying_contract="0x000000000022D473030F116dDEE9F6B43aC78BA3",
        )

        # Create test types
        types = {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "Transaction": [
                {"name": "to", "type": "address"},
                {"name": "value", "type": "uint256"},
                {"name": "data", "type": "bytes"},
            ],
        }

        primary_type = "Transaction"

        # Create test message
        message = {
            "to": "0x9999999999999999999999999999999999999999",
            "value": "1000000000000000000",
            "data": "0x00",
        }

        # Mock the sign_and_wrap_typed_data_for_smart_account function
        expected_signature = "0x" + "b" * 130  # 65 bytes signature in hex

        with patch("cdp.evm_smart_account.sign_and_wrap_typed_data_for_smart_account") as mock_sign:
            mock_sign.return_value = expected_signature

            # Call the method
            result = await smart_account.sign_typed_data(
                domain=domain,
                types=types,
                primary_type=primary_type,
                message=message,
                network="ethereum",
            )

            # Verify the result
            assert result == expected_signature

            # Verify the function was called with correct parameters
            mock_sign.assert_called_once()
            call_args = mock_sign.call_args

            assert call_args[0][0] == mock_api_clients  # api_clients

            options = call_args[0][1]  # SignAndWrapTypedDataForSmartAccountOptions
            assert options.smart_account == smart_account
            assert options.chain_id == 1  # Ethereum mainnet
            assert options.typed_data["domain"] == domain
            assert options.typed_data["types"] == types
            assert options.typed_data["primaryType"] == primary_type
            assert options.typed_data["message"] == message
            assert options.owner_index == 0

    @pytest.mark.asyncio
    async def test_sign_typed_data_with_base_network(self, smart_account_factory):
        """Test signing typed data on Base network."""
        from cdp.evm_message_types import EIP712Domain

        address = "0x1234567890123456789012345678901234567890"
        smart_account = smart_account_factory(address)

        mock_api_clients = AsyncMock(spec=ApiClients)
        smart_account = EvmSmartAccount(
            address, smart_account.owners[0], None, None, mock_api_clients
        )

        domain = EIP712Domain(
            name="Base Test",
            chain_id=8453,
            verifying_contract="0x1111111111111111111111111111111111111111",
        )

        types = {"Message": [{"name": "content", "type": "string"}]}
        primary_type = "Message"
        message = {"content": "Hello Base"}

        expected_signature = "0x" + "c" * 130

        with patch("cdp.evm_smart_account.sign_and_wrap_typed_data_for_smart_account") as mock_sign:
            mock_sign.return_value = expected_signature

            result = await smart_account.sign_typed_data(
                domain=domain,
                types=types,
                primary_type=primary_type,
                message=message,
                network="base",
            )

            assert result == expected_signature

            # Verify chain_id was set correctly for Base
            options = mock_sign.call_args[0][1]
            assert options.chain_id == 8453  # Base mainnet

    @pytest.mark.asyncio
    async def test_sign_typed_data_with_testnet(self, smart_account_factory):
        """Test signing typed data on testnet."""
        from cdp.evm_message_types import EIP712Domain

        address = "0x1234567890123456789012345678901234567890"
        smart_account = smart_account_factory(address)

        mock_api_clients = AsyncMock(spec=ApiClients)
        smart_account = EvmSmartAccount(
            address, smart_account.owners[0], None, None, mock_api_clients
        )

        domain = EIP712Domain(name="Sepolia Test", version="2", chain_id=11155111)

        types = {"Test": [{"name": "value", "type": "uint256"}]}
        primary_type = "Test"
        message = {"value": "42"}

        expected_signature = "0x" + "d" * 130

        with patch("cdp.evm_smart_account.sign_and_wrap_typed_data_for_smart_account") as mock_sign:
            mock_sign.return_value = expected_signature

            result = await smart_account.sign_typed_data(
                domain=domain,
                types=types,
                primary_type=primary_type,
                message=message,
                network="ethereum-sepolia",
            )

            assert result == expected_signature

            # Verify chain_id was set correctly for Ethereum Sepolia
            options = mock_sign.call_args[0][1]
            assert options.chain_id == 11155111

    @pytest.mark.asyncio
    async def test_sign_typed_data_invalid_network(self, smart_account_factory):
        """Test signing typed data with invalid network raises error."""
        from cdp.evm_message_types import EIP712Domain

        address = "0x1234567890123456789012345678901234567890"
        smart_account = smart_account_factory(address)

        mock_api_clients = AsyncMock(spec=ApiClients)
        smart_account = EvmSmartAccount(
            address, smart_account.owners[0], None, None, mock_api_clients
        )

        domain = EIP712Domain(name="Test")
        types = {}
        primary_type = "Test"
        message = {}

        # Test with unsupported network
        with pytest.raises(ValueError) as exc_info:
            await smart_account.sign_typed_data(
                domain=domain,
                types=types,
                primary_type=primary_type,
                message=message,
                network="unsupported-network",
            )

        assert "Unsupported network: unsupported-network" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_sign_typed_data_complex_types(self, smart_account_factory):
        """Test signing typed data with complex nested types."""
        from cdp.evm_message_types import EIP712Domain

        address = "0x1234567890123456789012345678901234567890"
        smart_account = smart_account_factory(address)

        mock_api_clients = AsyncMock(spec=ApiClients)
        smart_account = EvmSmartAccount(
            address, smart_account.owners[0], None, None, mock_api_clients
        )

        # Complex domain with all fields
        domain = EIP712Domain(
            name="Complex Protocol",
            version="3.1.4",
            chain_id=137,  # Polygon
            verifying_contract="0x2222222222222222222222222222222222222222",
            salt="0x" + "ff" * 32,
        )

        # Complex nested types
        types = {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
                {"name": "salt", "type": "bytes32"},
            ],
            "Order": [
                {"name": "maker", "type": "address"},
                {"name": "taker", "type": "address"},
                {"name": "assets", "type": "Asset[]"},
                {"name": "metadata", "type": "OrderMetadata"},
            ],
            "Asset": [
                {"name": "token", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "tokenId", "type": "uint256"},
            ],
            "OrderMetadata": [
                {"name": "deadline", "type": "uint256"},
                {"name": "salt", "type": "bytes32"},
                {"name": "flags", "type": "uint8"},
            ],
        }

        primary_type = "Order"

        # Complex nested message
        message = {
            "maker": "0x3333333333333333333333333333333333333333",
            "taker": "0x4444444444444444444444444444444444444444",
            "assets": [
                {
                    "token": "0x5555555555555555555555555555555555555555",
                    "amount": "1000000000000000000",
                    "tokenId": "1",
                },
                {
                    "token": "0x6666666666666666666666666666666666666666",
                    "amount": "2000000000000000000",
                    "tokenId": "2",
                },
            ],
            "metadata": {
                "deadline": "1234567890",
                "salt": "0x" + "aa" * 32,
                "flags": "255",
            },
        }

        expected_signature = "0x" + "e" * 130

        with patch("cdp.evm_smart_account.sign_and_wrap_typed_data_for_smart_account") as mock_sign:
            mock_sign.return_value = expected_signature

            result = await smart_account.sign_typed_data(
                domain=domain,
                types=types,
                primary_type=primary_type,
                message=message,
                network="polygon",
            )

            assert result == expected_signature

            # Verify all data was passed correctly
            options = mock_sign.call_args[0][1]
            assert options.chain_id == 137  # Polygon mainnet
            assert options.typed_data["domain"] == domain
            assert options.typed_data["types"] == types
            assert options.typed_data["primaryType"] == primary_type
            assert options.typed_data["message"] == message

    @pytest.mark.asyncio
    async def test_sign_typed_data_error_propagation(self, smart_account_factory):
        """Test that errors from sign_and_wrap_typed_data_for_smart_account are propagated."""
        from cdp.evm_message_types import EIP712Domain

        address = "0x1234567890123456789012345678901234567890"
        smart_account = smart_account_factory(address)

        mock_api_clients = AsyncMock(spec=ApiClients)
        smart_account = EvmSmartAccount(
            address, smart_account.owners[0], None, None, mock_api_clients
        )

        domain = EIP712Domain(name="Error Test")
        types = {}
        primary_type = "Test"
        message = {}

        # Mock the function to raise an error
        with patch("cdp.evm_smart_account.sign_and_wrap_typed_data_for_smart_account") as mock_sign:
            mock_sign.side_effect = Exception("Signing failed")

            with pytest.raises(Exception) as exc_info:
                await smart_account.sign_typed_data(
                    domain=domain,
                    types=types,
                    primary_type=primary_type,
                    message=message,
                    network="ethereum",
                )

            assert "Signing failed" in str(exc_info.value)


@pytest.mark.asyncio
async def test_network_scoped_smart_account_uses_base_node_rpc_as_paymaster(smart_account_factory):
    """Test that NetworkScopedEvmSmartAccount uses Base Node RPC URL as paymaster_url for UserOp sends on base networks."""
    smart_account = smart_account_factory()

    # Create network-scoped account for base network
    network_account = await smart_account.__experimental_use_network__("base")

    # Mock get_base_node_rpc_url to return a test URL
    base_node_url = "https://api.cdp.coinbase.com/rpc/v1/base/test-token-id"

    with patch(
        "cdp.network_scoped_evm_smart_account.get_base_node_rpc_url"
    ) as mock_get_base_node_rpc_url:
        mock_get_base_node_rpc_url.return_value = base_node_url

        # Mock the underlying send_user_operation function instead of the instance method
        with patch("cdp.evm_smart_account.send_user_operation") as mock_send_user_op:
            mock_user_op = MagicMock()
            mock_send_user_op.return_value = mock_user_op

            # Test send_user_operation
            calls = [MagicMock()]
            result = await network_account.send_user_operation(calls)

            # Verify that Base Node RPC URL was used as paymaster_url
            mock_get_base_node_rpc_url.assert_called_once()
            mock_send_user_op.assert_called_once_with(
                smart_account._EvmSmartAccount__api_clients,
                smart_account.address,
                smart_account.owners[0],
                calls,
                "base",
                base_node_url,
                None,  # data_suffix
            )

            assert result == mock_user_op
