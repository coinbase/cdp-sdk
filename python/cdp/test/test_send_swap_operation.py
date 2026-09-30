"""Tests for send_swap_operation module."""

import importlib
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.swap.send_swap_operation import (
    SendSwapOperationOptions,
    send_swap_operation,
)
from cdp.actions.evm.swap.types import (
    QuoteSwapResult,
    SmartAccountSwapResult,
    SwapAllowanceIssue,
    SwapBalanceIssue,
    SwapIssues,
)

# Resolve the module explicitly since `swap/__init__.py` shadows this submodule name with a
# same-named function, which breaks dotted-string mock.patch() targets on Python <=3.12.
send_swap_operation_module = importlib.import_module("cdp.actions.evm.swap.send_swap_operation")

MOCK_SMART_ACCOUNT_ADDRESS = "0x75EeF66719c92DD04a5d8f2643c742f5636a06bD"
MOCK_OWNER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"


def create_mock_swap_response(response_data: dict) -> MagicMock:
    """Create a mock CreateSwapQuoteResponse object from response data.

    This bypasses the buggy Pydantic validation in the generated code.
    """
    mock = MagicMock()
    mock.to_amount = response_data.get("toAmount")
    mock.min_to_amount = response_data.get("minToAmount")

    # Mock transaction
    tx_data = response_data.get("transaction", {})
    mock.transaction = MagicMock()
    mock.transaction.to = tx_data.get("to")
    mock.transaction.data = tx_data.get("data")
    mock.transaction.value = tx_data.get("value")
    mock.transaction.gas = tx_data.get("gas")
    mock.transaction.gas_price = tx_data.get("gasPrice")
    mock.transaction.max_fee_per_gas = tx_data.get("maxFeePerGas")
    mock.transaction.max_priority_fee_per_gas = tx_data.get("maxPriorityFeePerGas")

    # Mock permit2
    permit2_data = response_data.get("permit2")
    if permit2_data and permit2_data.get("eip712"):
        mock.permit2 = MagicMock()
        mock.permit2.eip712 = permit2_data.get("eip712")
        mock.permit2.hash = permit2_data.get("hash")
    else:
        mock.permit2 = None

    # Mock issues
    issues_data = response_data.get("issues")
    if issues_data is not None:
        mock.issues = MagicMock()
        mock.issues.allowance = None
        mock.issues.balance = None
        mock.issues.simulation_incomplete = issues_data.get("simulationIncomplete", False)
        if issues_data.get("allowance"):
            mock.issues.allowance = MagicMock(
                current_allowance=issues_data["allowance"].get("currentAllowance"),
                spender=issues_data["allowance"].get("spender"),
            )
        if issues_data.get("balance"):
            mock.issues.balance = MagicMock(
                token=issues_data["balance"].get("token"),
                current_balance=issues_data["balance"].get("currentBalance"),
                required_balance=issues_data["balance"].get("requiredBalance"),
            )
    else:
        mock.issues = None

    return mock


@pytest.fixture(autouse=True)
def patch_from_dict():
    """Patch CreateSwapQuoteResponse.from_dict to bypass buggy Pydantic validation."""
    with patch(
        "cdp.openapi_client.models.create_swap_quote_response.CreateSwapQuoteResponse.from_dict",
        side_effect=lambda obj: create_mock_swap_response(obj),
    ):
        yield


@pytest.fixture
def mock_smart_account():
    """Create a mock smart account."""
    owner = MagicMock()
    owner.address = MOCK_OWNER_ADDRESS

    smart_account = MagicMock()
    smart_account.address = MOCK_SMART_ACCOUNT_ADDRESS
    smart_account.owners = [owner]

    return smart_account


@pytest.fixture
def mock_api_clients():
    """Create mock API clients."""
    api_clients = MagicMock()
    api_clients.evm_swaps = MagicMock()

    # Mock the create_evm_swap_quote_without_preload_content response
    # (a clean quote: no allowance, balance, or simulation issues)
    mock_swap_response = MagicMock()
    mock_swap_response_data = {
        "liquidityAvailable": True,
        "toAmount": "500000000000000",
        "minToAmount": "495000000000000",
        "blockNumber": "123456",
        "fromToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "toToken": "0x4200000000000000000000000000000000000006",
        "fromAmount": "1000000",
        "fees": {
            "gasFee": {
                "amount": "1000000000000000",
                "token": "0x0000000000000000000000000000000000000000",
            },
            "protocolFee": {
                "amount": "0",
                "token": "0x0000000000000000000000000000000000000000",
            },
        },
        "issues": {
            "allowance": None,
            "balance": None,
            "simulationIncomplete": False,
        },
        "transaction": {
            "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            "data": "0xabc123def456",
            "value": "0",
            "gas": "200000",
            "gasPrice": "20000000000",
        },
        "permit2": None,  # No permit2 for this test
    }
    mock_swap_response.read = AsyncMock(
        return_value=json.dumps(mock_swap_response_data).encode("utf-8")
    )
    api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
        return_value=mock_swap_response
    )

    return api_clients


@pytest.fixture
def mock_quote():
    """Create a mock swap quote with no blocking issues."""
    return QuoteSwapResult(
        liquidity_available=True,
        quote_id="quote-123",
        from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        to_token="0x4200000000000000000000000000000000000006",
        from_amount="1000000",
        to_amount="500000000000000",
        min_to_amount="495000000000000",
        to="0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        data="0xabc123def456",
        value="0",
        network="base",
        gas_limit=200000,
    )


@patch.object(send_swap_operation_module, "send_user_operation")
@pytest.mark.asyncio
async def test_send_swap_operation_with_quote(
    mock_send_user_operation, mock_api_clients, mock_smart_account, mock_quote
):
    """Test send_swap_operation with a pre-created quote broadcasts a user operation."""
    mock_send_user_operation.return_value = MagicMock(
        user_op_hash="0xmocked_user_op_hash", status="pending"
    )

    swap_options = SendSwapOperationOptions(
        smart_account=mock_smart_account,
        network="base",
        swap_quote=mock_quote,
        idempotency_key="test-key",
    )

    result = await send_swap_operation(mock_api_clients, swap_options)

    assert isinstance(result, SmartAccountSwapResult)
    assert result.user_op_hash == "0xmocked_user_op_hash"
    assert result.smart_account_address == MOCK_SMART_ACCOUNT_ADDRESS
    assert result.status == "pending"

    # Check that send_user_operation was called with the smart account address
    assert mock_send_user_operation.call_count == 1
    assert mock_send_user_operation.call_args.kwargs["address"] == MOCK_SMART_ACCOUNT_ADDRESS


@patch.object(send_swap_operation_module, "send_user_operation")
@pytest.mark.asyncio
async def test_send_swap_operation_inline_params(
    mock_send_user_operation, mock_api_clients, mock_smart_account
):
    """Test send_swap_operation with inline parameters broadcasts a user operation."""
    mock_send_user_operation.return_value = MagicMock(
        user_op_hash="0xmocked_user_op_hash", status="pending"
    )

    swap_options = SendSwapOperationOptions(
        smart_account=mock_smart_account,
        network="base",
        from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        to_token="0x4200000000000000000000000000000000000006",
        from_amount="1000000",
        slippage_bps=100,
    )

    result = await send_swap_operation(mock_api_clients, swap_options)

    assert isinstance(result, SmartAccountSwapResult)
    assert result.user_op_hash == "0xmocked_user_op_hash"
    assert mock_send_user_operation.call_count == 1


@patch.object(send_swap_operation_module, "send_user_operation")
@pytest.mark.asyncio
async def test_send_swap_operation_fails_closed_on_allowance_issues(
    mock_send_user_operation, mock_api_clients, mock_smart_account, mock_quote
):
    """Test that send_swap_operation refuses to broadcast when the quote has allowance issues."""
    mock_quote.issues = SwapIssues(
        allowance=SwapAllowanceIssue(
            current_allowance="0",
            spender="0x000000000022D473030F116dDEE9F6B43aC78BA3",
        )
    )

    swap_options = SendSwapOperationOptions(
        smart_account=mock_smart_account,
        network="base",
        swap_quote=mock_quote,
    )

    with pytest.raises(ValueError, match="Insufficient token allowance for swap"):
        await send_swap_operation(mock_api_clients, swap_options)

    mock_send_user_operation.assert_not_called()


@patch.object(send_swap_operation_module, "send_user_operation")
@pytest.mark.asyncio
async def test_send_swap_operation_fails_closed_on_balance_issues(
    mock_send_user_operation, mock_api_clients, mock_smart_account, mock_quote
):
    """Test that send_swap_operation refuses to broadcast when the quote has balance issues."""
    mock_quote.issues = SwapIssues(
        balance=SwapBalanceIssue(
            token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            current_balance="900000",
            required_balance="1000000",
        )
    )

    swap_options = SendSwapOperationOptions(
        smart_account=mock_smart_account,
        network="base",
        swap_quote=mock_quote,
    )

    with pytest.raises(ValueError, match="Insufficient token balance for swap"):
        await send_swap_operation(mock_api_clients, swap_options)

    mock_send_user_operation.assert_not_called()


@patch.object(send_swap_operation_module, "send_user_operation")
@pytest.mark.asyncio
async def test_send_swap_operation_allows_incomplete_simulation(
    mock_send_user_operation, mock_api_clients, mock_smart_account, mock_quote
):
    """Test that send_swap_operation still broadcasts when the simulation is incomplete.

    simulation_incomplete only means the transaction could not be validated,
    not that the trade will revert, so the execute path deliberately does not
    fail closed on it.
    """
    mock_send_user_operation.return_value = MagicMock(
        user_op_hash="0xmocked_user_op_hash", status="pending"
    )
    mock_quote.issues = SwapIssues(simulation_incomplete=True)

    swap_options = SendSwapOperationOptions(
        smart_account=mock_smart_account,
        network="base",
        swap_quote=mock_quote,
    )

    result = await send_swap_operation(mock_api_clients, swap_options)

    assert isinstance(result, SmartAccountSwapResult)
    assert result.user_op_hash == "0xmocked_user_op_hash"
    mock_send_user_operation.assert_called_once()


@patch.object(send_swap_operation_module, "send_user_operation")
@pytest.mark.asyncio
async def test_send_swap_operation_inline_params_fails_closed_on_balance_issues(
    mock_send_user_operation, mock_api_clients, mock_smart_account
):
    """Test that inline swap params fail closed when the created quote has balance issues."""
    mock_response = MagicMock()
    mock_response_data = {
        "liquidityAvailable": True,
        "toAmount": "500000000000000",
        "minToAmount": "495000000000000",
        "blockNumber": "123456",
        "fromToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "toToken": "0x4200000000000000000000000000000000000006",
        "fromAmount": "1000000",
        "fees": {
            "gasFee": {
                "amount": "1000000000000000",
                "token": "0x0000000000000000000000000000000000000000",
            },
            "protocolFee": {
                "amount": "0",
                "token": "0x0000000000000000000000000000000000000000",
            },
        },
        "issues": {
            "allowance": None,
            "balance": {
                "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "currentBalance": "900000",
                "requiredBalance": "1000000",
            },
            "simulationIncomplete": False,
        },
        "transaction": {
            "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            "data": "0xabc123def456",
            "value": "0",
            "gas": "200000",
            "gasPrice": "20000000000",
        },
        "permit2": None,
    }
    mock_response.read = AsyncMock(return_value=json.dumps(mock_response_data).encode("utf-8"))
    mock_api_clients.evm_swaps.create_evm_swap_quote_without_preload_content = AsyncMock(
        return_value=mock_response
    )

    swap_options = SendSwapOperationOptions(
        smart_account=mock_smart_account,
        network="base",
        from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        to_token="0x4200000000000000000000000000000000000006",
        from_amount="1000000",
    )

    with pytest.raises(ValueError, match="Insufficient token balance for swap"):
        await send_swap_operation(mock_api_clients, swap_options)

    mock_send_user_operation.assert_not_called()
