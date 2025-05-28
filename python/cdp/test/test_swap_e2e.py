"""E2E tests for swap functionality."""

import asyncio

import pytest
import pytest_asyncio
from dotenv import load_dotenv
from eth_account.account import Account
from web3 import Web3

from cdp import CdpClient
from cdp.actions.evm.swap import SwapOptions

load_dotenv()

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


@pytest_asyncio.fixture(scope="function")
async def cdp_client():
    """Create and configure CDP client for all tests."""
    client = CdpClient()
    yield client
    await client.close()


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_get_swap_quote(cdp_client):
    """Test getting a swap quote."""
    # Get quote for swapping ETH to USDC
    quote = await cdp_client.evm.get_quote(
        from_asset="eth",
        to_asset="usdc",
        amount="1000000000000000",  # 0.001 ETH
        network="base-sepolia"
    )
    
    assert quote is not None
    assert quote.from_asset == "eth"
    assert quote.to_asset == "usdc"
    assert quote.from_amount == "1000000000000000"
    assert quote.to_amount is not None
    assert quote.price_impact is not None
    assert quote.route is not None
    assert isinstance(quote.route, list)


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_get_swap_quote_with_contract_addresses(cdp_client):
    """Test getting a swap quote with contract addresses."""
    # USDC address on Base Sepolia
    usdc_address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    
    quote = await cdp_client.evm.get_quote(
        from_asset=usdc_address,
        to_asset="eth",
        amount=1000000,  # 1 USDC (6 decimals)
        network="base-sepolia"
    )
    
    assert quote is not None
    assert quote.from_asset == usdc_address
    assert quote.to_asset == "eth"
    assert quote.from_amount == "1000000"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_swap_eth_to_usdc(cdp_client):
    """Test swapping ETH to USDC."""
    account = await cdp_client.evm.create_account()
    assert account is not None
    
    await _ensure_sufficient_eth_balance(cdp_client, account)
    
    # Swap a tiny amount of ETH to USDC
    swap_result = await account.swap(
        SwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000",  # 0.000001 ETH
            network="base-sepolia",
            slippage_percentage=1.0,
        )
    )
    
    assert swap_result is not None
    assert swap_result.transaction_hash is not None
    assert swap_result.status == "completed"
    assert swap_result.from_asset == "eth"
    assert swap_result.to_asset == "usdc"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_swap_usdc_to_eth(cdp_client):
    """Test swapping USDC to ETH."""
    account = await cdp_client.evm.create_account()
    assert account is not None
    
    await _ensure_sufficient_eth_balance(cdp_client, account)
    
    # First ensure we have some USDC by swapping ETH to USDC
    initial_swap = await account.swap({
        "from_asset": "eth",
        "to_asset": "usdc",
        "amount": "10000000000000",  # 0.00001 ETH
        "network": "base-sepolia",
    })
    
    # Wait for the initial swap to complete
    await asyncio.sleep(5)
    
    # Now swap USDC back to ETH
    swap_result = await account.swap(
        SwapOptions(
            from_asset="usdc",
            to_asset="eth",
            amount="10000",  # 0.01 USDC
            network="base-sepolia",
            slippage_percentage=2.0,
        )
    )
    
    assert swap_result is not None
    assert swap_result.transaction_hash is not None
    assert swap_result.status == "completed"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_swap_eth_to_usdc_smart_account(cdp_client):
    """Test swapping ETH to USDC with a smart account."""
    owner = Account.create()
    smart_account = await cdp_client.evm.create_smart_account(owner=owner)
    assert smart_account is not None
    
    await _ensure_sufficient_eth_balance(cdp_client, smart_account)
    
    # Swap ETH to USDC using gasless transaction
    swap_result = await smart_account.swap(
        SwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000",  # 0.000001 ETH
            network="base-sepolia",
            slippage_percentage=1.0,
        )
    )
    
    assert swap_result is not None
    assert swap_result.transaction_hash is not None
    assert swap_result.status == "completed"
    assert swap_result.from_asset == "eth"
    assert swap_result.to_asset == "usdc"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_swap_usdc_to_weth_smart_account(cdp_client):
    """Test swapping USDC to WETH with a smart account."""
    owner = Account.create()
    smart_account = await cdp_client.evm.create_smart_account(owner=owner)
    assert smart_account is not None
    
    await _ensure_sufficient_eth_balance(cdp_client, smart_account)
    
    # First get some USDC
    initial_swap = await smart_account.swap({
        "from_asset": "eth",
        "to_asset": "usdc",
        "amount": "10000000000000",  # 0.00001 ETH
        "network": "base-sepolia",
    })
    
    # Wait for the initial swap
    await asyncio.sleep(5)
    
    # Swap USDC to WETH (gasless)
    swap_result = await smart_account.swap(
        SwapOptions(
            from_asset="usdc",
            to_asset="weth",
            amount="10000",  # 0.01 USDC
            network="base-sepolia",
            slippage_percentage=1.5,
        )
    )
    
    assert swap_result is not None
    assert swap_result.transaction_hash is not None
    assert swap_result.status == "completed"
    assert swap_result.from_asset == "usdc"
    assert swap_result.to_asset == "weth"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_swap_with_high_slippage(cdp_client):
    """Test swap with high slippage tolerance."""
    account = await cdp_client.evm.create_account()
    assert account is not None
    
    await _ensure_sufficient_eth_balance(cdp_client, account)
    
    # Swap with 5% slippage
    swap_result = await account.swap(
        SwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="1000000000000",  # 0.000001 ETH
            network="base-sepolia",
            slippage_percentage=5.0,
        )
    )
    
    assert swap_result is not None
    assert swap_result.transaction_hash is not None
    assert swap_result.status == "completed"


async def _ensure_sufficient_eth_balance(cdp_client, account):
    """Ensure an account has sufficient ETH balance for testing."""
    min_required_balance = w3.to_wei(0.0001, "ether")  # Need some ETH for swaps
    
    eth_balance = w3.eth.get_balance(account.address)
    
    print(f"Current ETH balance: {w3.from_wei(eth_balance, 'ether')} ETH")
    
    if eth_balance < min_required_balance:
        print(
            f"ETH balance below minimum required ({w3.from_wei(min_required_balance, 'ether')} ETH)"
        )
        faucet_hash = await cdp_client.evm.request_faucet(
            address=account.address, network="base-sepolia", token="eth"
        )
        
        print(f"Faucet request submitted: {faucet_hash}")
        
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        
        # Verify the balance is now sufficient
        new_balance = w3.eth.get_balance(account.address)
        assert (
            new_balance >= min_required_balance
        ), f"Balance still insufficient after faucet request: {w3.from_wei(new_balance, 'ether')} ETH"
        return new_balance
    else:
        print(f"ETH balance is sufficient: {w3.from_wei(eth_balance, 'ether')} ETH")
    
    return eth_balance 
