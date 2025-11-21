import importlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.api_clients import ApiClients
from cdp.evm_call_types import EncodedCall
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.exceptions import ApiException
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation

smart_account_transfer_strategy_module = importlib.import_module(
    "cdp.actions.evm.transfer.smart_account_transfer_strategy"
)
SmartAccountTransferStrategy = smart_account_transfer_strategy_module.SmartAccountTransferStrategy
smart_account_transfer_strategy = (
    smart_account_transfer_strategy_module.smart_account_transfer_strategy
)


@pytest.fixture
def mock_api_clients():
    """Create a mock ApiClients instance."""
    clients = MagicMock(spec=ApiClients)
    clients.evm_smart_accounts.prepare_user_operation = AsyncMock()
    clients.evm_smart_accounts.send_user_operation = AsyncMock()
    return clients


@pytest.fixture
def mock_smart_account():
    """Create a mock EvmSmartAccount instance."""
    account = MagicMock(spec=EvmSmartAccount)
    account.address = "0x1234567890123456789012345678901234567890"
    account.owners = [MagicMock()]
    return account


@pytest.fixture
def strategy():
    """Create a SmartAccountTransferStrategy instance."""
    return SmartAccountTransferStrategy()


@pytest.mark.asyncio
async def test_execute_transfer_eth_success(strategy, mock_api_clients, mock_smart_account):
    """Test successful ETH transfer execution."""
    with patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send:
        mock_user_op = MagicMock(spec=EvmUserOperation)
        mock_user_op.user_op_hash = "0xhash123"
        mock_send.return_value = mock_user_op

        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            to="0x9876543210987654321098765432109876543210",
            value=1000000000000000000,  # 1 ETH in wei
            token="eth",
            network="base-sepolia",
            paymaster_url="https://paymaster.example.com",
        )

        assert result == mock_user_op
        mock_send.assert_called_once_with(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[
                EncodedCall(
                    to="0x9876543210987654321098765432109876543210",
                    value="1000000000000000000",
                    data="0x",
                )
            ],
            network="base-sepolia",
            paymaster_url="https://paymaster.example.com",
        )


@pytest.mark.asyncio
async def test_execute_transfer_eth_no_paymaster(strategy, mock_api_clients, mock_smart_account):
    """Test ETH transfer execution without paymaster."""
    with patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send:
        mock_user_op = MagicMock(spec=EvmUserOperation)
        mock_send.return_value = mock_user_op

        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            to="0x9876543210987654321098765432109876543210",
            value=500000000000000000,  # 0.5 ETH in wei
            token="eth",
            network="base",
            paymaster_url=None,
        )

        assert result == mock_user_op
        mock_send.assert_called_once_with(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[
                EncodedCall(
                    to="0x9876543210987654321098765432109876543210",
                    value="500000000000000000",
                    data="0x",
                )
            ],
            network="base",
            paymaster_url=None,
        )


@pytest.mark.asyncio
async def test_execute_transfer_erc20_success(strategy, mock_api_clients, mock_smart_account):
    """Test successful ERC20 token transfer execution."""
    with (
        patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send,
        patch.object(smart_account_transfer_strategy_module, "get_erc20_address") as mock_get_addr,
        patch.object(smart_account_transfer_strategy_module, "Web3") as mock_web3,
    ):
        mock_get_addr.return_value = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

        mock_contract = MagicMock()
        mock_contract.encode_abi.return_value = "0xa9059cbb0000000000000000000000009876543210987654321098765432109876543210000000000000000000000000000000000000000000000000000000000000f424"

        mock_web3_instance = MagicMock()
        mock_web3_instance.eth.contract.return_value = mock_contract
        mock_web3.return_value = mock_web3_instance

        mock_user_op = MagicMock(spec=EvmUserOperation)
        mock_send.return_value = mock_user_op

        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            to="0x9876543210987654321098765432109876543210",
            value=1000000,  # 1 USDC (6 decimals)
            token="usdc",
            network="base",
            paymaster_url="https://paymaster.example.com",
        )

        assert result == mock_user_op
        mock_get_addr.assert_called_once_with("usdc", "base")
        mock_web3.assert_called_once()
        from cdp.actions.evm.transfer.constants import ERC20_ABI

        mock_web3_instance.eth.contract.assert_called_once_with(abi=ERC20_ABI)
        mock_contract.encode_abi.assert_called_once_with(
            "transfer", args=["0x9876543210987654321098765432109876543210", 1000000]
        )
        mock_send.assert_called_once_with(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[
                EncodedCall(
                    to="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    data="0xa9059cbb0000000000000000000000009876543210987654321098765432109876543210000000000000000000000000000000000000000000000000000000000000f424",
                )
            ],
            network="base",
            paymaster_url="https://paymaster.example.com",
        )


@pytest.mark.asyncio
async def test_execute_transfer_erc20_contract_address(
    strategy, mock_api_clients, mock_smart_account
):
    """Test ERC20 transfer with direct contract address."""
    with (
        patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send,
        patch.object(smart_account_transfer_strategy_module, "get_erc20_address") as mock_get_addr,
        patch.object(smart_account_transfer_strategy_module, "Web3") as mock_web3,
    ):
        contract_address = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
        mock_get_addr.return_value = contract_address

        mock_contract = MagicMock()
        mock_contract.encode_abi.return_value = "0xa9059cbb0000000000000000000000009876543210987654321098765432109876543210000000000000000000000000000000000000000000000000000de0b6b3a7640000"

        mock_web3_instance = MagicMock()
        mock_web3_instance.eth.contract.return_value = mock_contract
        mock_web3.return_value = mock_web3_instance

        mock_user_op = MagicMock(spec=EvmUserOperation)
        mock_send.return_value = mock_user_op

        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            to="0x9876543210987654321098765432109876543210",
            value=1000000000000000000,  # 1 token (18 decimals)
            token=contract_address,
            network="base",
            paymaster_url=None,
        )

        assert result == mock_user_op
        mock_get_addr.assert_called_once_with(contract_address, "base")


@pytest.mark.asyncio
async def test_execute_transfer_eth_send_user_operation_error(
    strategy, mock_api_clients, mock_smart_account
):
    """Test ETH transfer when send_user_operation raises an error."""
    with patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send:
        mock_send.side_effect = ApiException(status=500, reason="Internal Server Error")

        with pytest.raises(ApiException) as exc_info:
            await strategy.execute_transfer(
                api_clients=mock_api_clients,
                from_account=mock_smart_account,
                to="0x9876543210987654321098765432109876543210",
                value=1000000000000000000,
                token="eth",
                network="base-sepolia",
                paymaster_url="https://paymaster.example.com",
            )

        assert exc_info.value.status == 500
        assert exc_info.value.reason == "Internal Server Error"


@pytest.mark.asyncio
async def test_execute_transfer_erc20_get_address_error(
    strategy, mock_api_clients, mock_smart_account
):
    """Test ERC20 transfer when get_erc20_address raises an error."""
    with patch.object(smart_account_transfer_strategy_module, "get_erc20_address") as mock_get_addr:
        mock_get_addr.side_effect = ValueError("Unsupported token")

        with pytest.raises(ValueError, match="Unsupported token"):
            await strategy.execute_transfer(
                api_clients=mock_api_clients,
                from_account=mock_smart_account,
                to="0x9876543210987654321098765432109876543210",
                value=1000000,
                token="unknown_token",
                network="base",
                paymaster_url=None,
            )

        mock_get_addr.assert_called_once_with("unknown_token", "base")


@pytest.mark.asyncio
async def test_execute_transfer_erc20_encoding_error(
    strategy, mock_api_clients, mock_smart_account
):
    """Test ERC20 transfer when ABI encoding fails."""
    with (
        patch.object(smart_account_transfer_strategy_module, "get_erc20_address") as mock_get_addr,
        patch.object(smart_account_transfer_strategy_module, "Web3") as mock_web3,
    ):
        mock_get_addr.return_value = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

        mock_contract = MagicMock()
        mock_contract.encode_abi.side_effect = ValueError("Invalid ABI encoding")

        mock_web3_instance = MagicMock()
        mock_web3_instance.eth.contract.return_value = mock_contract
        mock_web3.return_value = mock_web3_instance

        with pytest.raises(ValueError, match="Invalid ABI encoding"):
            await strategy.execute_transfer(
                api_clients=mock_api_clients,
                from_account=mock_smart_account,
                to="0x9876543210987654321098765432109876543210",
                value=1000000,
                token="usdc",
                network="base",
                paymaster_url=None,
            )


@pytest.mark.asyncio
async def test_execute_transfer_erc20_send_user_operation_error(
    strategy, mock_api_clients, mock_smart_account
):
    """Test ERC20 transfer when send_user_operation raises an error."""
    with (
        patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send,
        patch.object(smart_account_transfer_strategy_module, "get_erc20_address") as mock_get_addr,
        patch.object(smart_account_transfer_strategy_module, "Web3") as mock_web3,
    ):
        mock_get_addr.return_value = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

        mock_contract = MagicMock()
        mock_contract.encode_abi.return_value = "0xa9059cbb0000000000000000000000009876543210987654321098765432109876543210000000000000000000000000000000000000000000000000000000000000f424"

        mock_web3_instance = MagicMock()
        mock_web3_instance.eth.contract.return_value = mock_contract
        mock_web3.return_value = mock_web3_instance

        mock_send.side_effect = ApiException(status=400, reason="Bad Request")

        with pytest.raises(ApiException) as exc_info:
            await strategy.execute_transfer(
                api_clients=mock_api_clients,
                from_account=mock_smart_account,
                to="0x9876543210987654321098765432109876543210",
                value=1000000,
                token="usdc",
                network="base",
                paymaster_url=None,
            )

        assert exc_info.value.status == 400
        assert exc_info.value.reason == "Bad Request"


@pytest.mark.asyncio
async def test_execute_transfer_zero_value_eth(strategy, mock_api_clients, mock_smart_account):
    """Test ETH transfer with zero value."""
    with patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send:
        mock_user_op = MagicMock(spec=EvmUserOperation)
        mock_send.return_value = mock_user_op

        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            to="0x9876543210987654321098765432109876543210",
            value=0,
            token="eth",
            network="base",
            paymaster_url=None,
        )

        assert result == mock_user_op
        mock_send.assert_called_once_with(
            api_clients=mock_api_clients,
            address=mock_smart_account.address,
            owner=mock_smart_account.owners[0],
            calls=[
                EncodedCall(to="0x9876543210987654321098765432109876543210", value="0", data="0x")
            ],
            network="base",
            paymaster_url=None,
        )


@pytest.mark.asyncio
async def test_execute_transfer_zero_value_erc20(strategy, mock_api_clients, mock_smart_account):
    """Test ERC20 transfer with zero value."""
    with (
        patch.object(smart_account_transfer_strategy_module, "send_user_operation") as mock_send,
        patch.object(smart_account_transfer_strategy_module, "get_erc20_address") as mock_get_addr,
        patch.object(smart_account_transfer_strategy_module, "Web3") as mock_web3,
    ):
        mock_get_addr.return_value = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        mock_contract = MagicMock()
        mock_contract.encode_abi.return_value = "0xa9059cbb00000000000000000000000098765432109876543210987654321098765432100000000000000000000000000000000000000000000000000000000000000000"
        mock_web3_instance = MagicMock()
        mock_web3_instance.eth.contract.return_value = mock_contract
        mock_web3.return_value = mock_web3_instance

        mock_user_op = MagicMock(spec=EvmUserOperation)
        mock_send.return_value = mock_user_op

        result = await strategy.execute_transfer(
            api_clients=mock_api_clients,
            from_account=mock_smart_account,
            to="0x9876543210987654321098765432109876543210",
            value=0,
            token="usdc",
            network="base",
            paymaster_url=None,
        )

        assert result == mock_user_op
        mock_contract.encode_abi.assert_called_once_with(
            "transfer", args=["0x9876543210987654321098765432109876543210", 0]
        )


def test_smart_account_transfer_strategy_instance():
    """Test that the module exports a strategy instance."""
    assert isinstance(smart_account_transfer_strategy, SmartAccountTransferStrategy)


def test_smart_account_transfer_strategy_inheritance():
    """Test that SmartAccountTransferStrategy inherits from TransferExecutionStrategy."""
    from cdp.actions.evm.transfer.types import TransferExecutionStrategy

    strategy = SmartAccountTransferStrategy()
    assert isinstance(strategy, TransferExecutionStrategy)
