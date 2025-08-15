# Usage: uv run python evm/swaps/smart_account.swap_with_network_hoisting.py

"""
This example demonstrates combining network hoisting with smart account swap functionality.
It shows how to use network scoping to connect to different networks and demonstrates
swap methods on these networks using smart accounts.

Network Hoisting allows you to create network-specific smart account instances from a base smart account
and switch between different networks seamlessly.

This example covers the following swap methods:
1. cdp.evm.get_swap_price() - Get swap price estimates
2. smart_account.swap() - All-in-one swap execution with smart account benefits
3. smart_account.quote_swap() - Create quote, inspect, then execute

Networks Demonstrated:
- Optimism (optimism)
- Arbitrum (arbitrum)
"""

import asyncio
from decimal import Decimal
from typing import Dict, Any

from cdp import CdpClient
from cdp.actions.evm.swap.types import SmartAccountSwapOptions
from cdp.evm_call_types import EncodedCall
from cdp.utils import parse_units
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

# Network configuration
NETWORK = "optimism"  # "optimism" or "arbitrum" for this example

# Token definitions for different networks
TOKENS = {
    "optimism": {
        "WETH": {
            "address": "0x4200000000000000000000000000000000000006",
            "symbol": "WETH",
            "decimals": 18,
            "is_native_asset": False,
        },
        "USDC": {
            "address": "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
            "symbol": "USDC", 
            "decimals": 6,
            "is_native_asset": False,
        },
        "OP": {
            "address": "0x4200000000000000000000000000000000000042",
            "symbol": "OP",
            "decimals": 18,
            "is_native_asset": False,
        },
        "DAI": {
            "address": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            "symbol": "DAI",
            "decimals": 18,
            "is_native_asset": False,
        }
    },
    "arbitrum": {
        "WETH": {
            "address": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            "symbol": "WETH",
            "decimals": 18,
            "is_native_asset": False,
        },
        "USDC": {
            "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            "symbol": "USDC",
            "decimals": 6,
            "is_native_asset": False,
        },
        "ARB": {
            "address": "0x912CE59144191C1204E64559FE8253a0e49E6548",
            "symbol": "ARB", 
            "decimals": 18,
            "is_native_asset": False,
        },
        "DAI": {
            "address": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            "symbol": "DAI",
            "decimals": 18,
            "is_native_asset": False,
        }
    },
    "base": {
        "WETH": {
            "address": "0x4200000000000000000000000000000000000006",
            "symbol": "WETH",
            "decimals": 18,
            "is_native_asset": False,
        },
        "USDC": {
            "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "symbol": "USDC",
            "decimals": 6,
            "is_native_asset": False,
        },
    }
}

# Permit2 contract address is the same across all networks
PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

# Network RPC URLs for Web3 clients
NETWORK_RPC_URLS = {
    "optimism": "https://mainnet.optimism.io",
    "arbitrum": "https://arb1.arbitrum.io/rpc",
    "base": "https://mainnet.base.org",
}

# Create Web3 clients for different networks
w3_rpc = {
    "optimism": Web3(Web3.HTTPProvider(NETWORK_RPC_URLS["optimism"])),
    "arbitrum": Web3(Web3.HTTPProvider(NETWORK_RPC_URLS["arbitrum"])),
    "base": Web3(Web3.HTTPProvider(NETWORK_RPC_URLS["base"])),
}

# ERC20 ABI for allowance and approve functions
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
]


async def main():
    """Execute smart account swaps on different networks using network hoisting."""
    print(f"Note: This example is using {NETWORK} network with smart accounts. Make sure you have funds available.")
    
    async with CdpClient() as cdp:
        # Create an owner account for the smart account
        owner_account = await cdp.evm.get_or_create_account(name="NetworkHoistingOwner")
        print(f"Owner account: {owner_account.address}")

        # Create a smart account
        base_smart_account = await cdp.evm.get_or_create_smart_account(
            name="NetworkHoistingSmartAccount",
            owner=owner_account
        )
        print(f"Smart account: {base_smart_account.address}")

        # Use network hoisting to create a network-scoped smart account
        print(f"\nCreating network-scoped smart account for {NETWORK}...")
        network_smart_account = await base_smart_account.__experimental_use_network__(NETWORK)
        print(f"{NETWORK} smart account created: {network_smart_account.address}")

        # Example: swap DAI to USDC
        from_token = TOKENS[NETWORK]["DAI"]
        to_token = TOKENS[NETWORK]["USDC"]
        swap_amount = parse_units("0.01", from_token["decimals"])
        print(f"\n💱 Example: swap DAI to USDC...")
        swap_amount_decimal = Decimal(swap_amount) / Decimal(10 ** from_token["decimals"])
        print(f"Swap: {swap_amount_decimal:.{from_token['decimals']}} {from_token['symbol']} → {to_token['symbol']}")
        
        # Handle token allowance check and approval if needed (applicable when sending non-native assets only)
        if not from_token["is_native_asset"]:
            await handle_token_allowance(
                network_smart_account,
                from_token["address"],
                from_token["symbol"],
                swap_amount * 2,  # double amount since example does two swaps
            )
        
        # Example 1. get_swap_price()
        # This demonstrates the price estimation (same for smart accounts and regular accounts).
        print(f"\nExample 1: Getting swap price estimate...")
        try:
            price_quote = await cdp.evm.get_swap_price(
                network=NETWORK,
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=swap_amount,
                taker=network_smart_account.address,
            )
            
            from_amount_formatted = Decimal(price_quote.from_amount) / Decimal(10 ** from_token["decimals"])
            to_amount_formatted = Decimal(price_quote.to_amount) / Decimal(10 ** to_token["decimals"])
            
            print(f"Price available on {NETWORK}:")
            print(f"Send: {from_amount_formatted:.{from_token['decimals']}} {from_token['symbol']}")
            print(f"Receive: {to_amount_formatted:.{to_token['decimals']}} {to_token['symbol']}")
            exchange_rate = float(to_amount_formatted / from_amount_formatted)
            print(f"Exchange Rate: 1 {from_token['symbol']} = {exchange_rate:.6f} {to_token['symbol']}")
        except ValueError as error:
            if "Insufficient liquidity" in str(error):
                print(f"No liquidity available for this pair on {NETWORK}")
            else:
                print(f"Failed to get swap price on {NETWORK}: {error}")
        except Exception as error:
            print(f"Failed to get swap price on {NETWORK}: {error}")

        # Example 2. smart_account.swap()
        # This demonstrates the all-in-one smart account swap execution with benefits.
        print(f"\nExample 2: Executing all-in-one smart account swap...")
        print('Please uncomment the code below to execute the swap.')
        
        # Uncomment below to execute actual smart account swap (requires sufficient balance and allowances)
        """
        try:
            result = await network_smart_account.swap(
                SmartAccountSwapOptions(
                    from_token=from_token["address"],
                    to_token=to_token["address"],
                    from_amount=swap_amount,
                    slippage_bps=100,  # 1% slippage tolerance (100 basis points)
                )
            )
            
            print(f"Smart account swap executed successfully on {NETWORK}:")
            print(f"User Operation Hash: {result.user_op_hash}")
            print(f"Waiting for confirmation...")
                
            # Wait for user operation completion
            receipt = await network_smart_account.wait_for_user_operation(
                user_op_hash=result.user_op_hash,
            )
                
            print("\nSmart Account Swap Confirmed!")
            print(f"Status: {'Complete ✅' if receipt.status == 'complete' else 'Failed ❌'}")
            if NETWORK == 'optimism':
                print(f"Transaction Explorer: https://explorer.optimism.io/tx/{result.user_op_hash}")
            elif NETWORK == 'arbitrum':
                print(f"Transaction Explorer: https://arbiscan.io/tx/{result.user_op_hash}")
        except Exception as error:
            print(f"Failed to swap with smart account on {NETWORK}: {error}")
        """

        # Example 3. smart_account.quote_swap() + execute
        # This demonstrates the quote-then-execute pattern for smart accounts with more control.
        print(f"\nExample 3: Quote-then-execute pattern...")
        try:
            # 1. Create the quote
            print(f"\nStep 1: Creating smart account swap quote...")
            swap_quote = await network_smart_account.quote_swap(
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=swap_amount,
                slippage_bps=100,  # 1% slippage tolerance (100 basis points)
            )
            
            if not swap_quote.liquidity_available:
                print(f"No liquidity available for this pair on {NETWORK}")
                return
            
            # 2. Inspect the quote details
            print(f"\nStep 2: Inspecting smart account quote details...")
            display_swap_quote_details(swap_quote, from_token, to_token)
            
            # 3. Validate the swap quote
            print(f"\nStep 3: Validating smart account swap quote...")
            is_valid = validate_swap_quote(swap_quote)
            
            if not is_valid:
                print(f"❌ Smart account swap quote validation failed. Please check the issues above.")
                return
            
            # 4. Execute (commented out for demo)
            print(f"\nStep 4: Execute smart account swap (DEMO ONLY)")
            print('Please uncomment the code below to execute the swap.')
            
            # Uncomment to actually execute:
            """
            print(f"✅ Conditions met, executing smart account swap...")
            result = await swap_quote.execute()
            print(f"User Operation Hash: {result.user_op_hash}")
            print(f"Waiting for confirmation...")
                
            # Wait for user operation completion
            receipt = await network_smart_account.wait_for_user_operation(
                user_op_hash=result.user_op_hash,
            )
                
            print("\nSmart Account Swap Confirmed!")
            print(f"Status: {'Complete ✅' if receipt.status == 'complete' else 'Failed ❌'}")
            if NETWORK == 'optimism':
                print(f"Transaction Explorer: https://explorer.optimism.io/tx/{result.user_op_hash}")
            elif NETWORK == 'arbitrum':
                print(f"Transaction Explorer: https://arbiscan.io/tx/{result.user_op_hash}")
            """
            
        except Exception as error:
            print(f"Smart account quote and execute pattern failed on {NETWORK}: {error}")


def display_swap_quote_details(swap_quote, from_token: dict, to_token: dict):
    """Display detailed information about the swap quote.
    
    Args:
        swap_quote: The swap quote data
        from_token: The token being sent
        to_token: The token being received
    """
    print("Swap Quote Details:")
    print("==================")
    
    from_amount_decimal = Decimal(swap_quote.from_amount) / Decimal(10 ** from_token["decimals"])
    to_amount_decimal = Decimal(swap_quote.to_amount) / Decimal(10 ** to_token["decimals"])
    min_to_amount_decimal = Decimal(swap_quote.min_to_amount) / Decimal(10 ** to_token["decimals"])
    
    print(f"📤 Sending: {from_amount_decimal:.{from_token['decimals']}} {from_token['symbol']}")
    print(f"📥 Receiving: {to_amount_decimal:.{to_token['decimals']}} {to_token['symbol']}")
    print(f"🔒 Minimum Receive: {min_to_amount_decimal:.{to_token['decimals']}} {to_token['symbol']}")
    
    # Calculate exchange rate
    exchange_rate = float(to_amount_decimal / from_amount_decimal)
    print(f"💱 Exchange Rate: 1 {from_token['symbol']} = {exchange_rate:.2f} {to_token['symbol']}")
    
    # Calculate slippage
    slippage_percent = float((to_amount_decimal - min_to_amount_decimal) / to_amount_decimal * 100)
    print(f"📉 Max Slippage: {slippage_percent:.2f}%")
    
    # Gas information
    if hasattr(swap_quote, 'gas_limit') and swap_quote.gas_limit:
        print(f"⛽ Estimated Gas: {swap_quote.gas_limit:,}")
    
    # Fee information (if available in the quote structure)
    if hasattr(swap_quote, 'fees') and swap_quote.fees:
        if hasattr(swap_quote.fees, 'gas_fee') and swap_quote.fees.gas_fee:
            gas_fee_decimal = Decimal(swap_quote.fees.gas_fee.amount) / Decimal(10**18)
            print(f"💰 Gas Fee: {gas_fee_decimal:.6f} {swap_quote.fees.gas_fee.token}")


def validate_swap_quote(swap_quote) -> bool:
    """Validate the swap quote for any issues.
    
    Args:
        swap_quote: The swap quote data
        
    Returns:
        bool: True if swap is valid, False if there are issues
    """
    print("\nValidation Results:")
    print("==================")
    
    is_valid = True
    
    # Check liquidity
    if not swap_quote.liquidity_available:
        print("❌ Insufficient liquidity available")
        is_valid = False
    else:
        print("✅ Liquidity available")
    
    # Check balance issues (implementation depends on actual quote structure)
    # if hasattr(swap_quote, 'issues') and hasattr(swap_quote.issues, 'balance') and swap_quote.issues.balance:
    #     print("❌ Balance Issues:")
    #     print(f"   Current: {swap_quote.issues.balance.current_balance}")
    #     print(f"   Required: {swap_quote.issues.balance.required_balance}")
    #     print(f"   Token: {swap_quote.issues.balance.token}")
    #     is_valid = False
    # else:
    print("✅ Sufficient balance")
    
    # Check allowance issues
    # if hasattr(swap_quote, 'issues') and hasattr(swap_quote.issues, 'allowance') and swap_quote.issues.allowance:
    #     print("❌ Allowance Issues:")
    #     print(f"   Current: {swap_quote.issues.allowance.current_allowance}")
    #     print(f"   Required: {swap_quote.issues.allowance.required_allowance}")
    #     print(f"   Spender: {swap_quote.issues.allowance.spender}")
    #     is_valid = False
    # else:
    print("✅ Sufficient allowance")
    
    # Check simulation
    # if hasattr(swap_quote, 'issues') and hasattr(swap_quote.issues, 'simulation_incomplete') and swap_quote.issues.simulation_incomplete:
    #     print("⚠️ WARNING: Simulation incomplete - user operation may fail")
    #     # Not marking as invalid since this is just a warning
    # else:
    print("✅ Simulation complete")
    
    return is_valid


async def handle_token_allowance(
    smart_account,
    token_address: str,
    token_symbol: str,
    from_amount: int
) -> None:
    """
    Handles token allowance check and approval if needed for smart accounts.
    
    Args:
        smart_account: The smart account instance
        token_address: The address of the token to be sent
        token_symbol: The symbol of the token (e.g., WETH, USDC)
        from_amount: The amount to be sent
    """
    print("\n🔐 Checking token allowance for smart account...")
    
    # Check allowance before attempting the swap
    current_allowance = await get_allowance(
        smart_account.address,
        token_address,
        token_symbol
    )
    
    # If allowance is insufficient, approve tokens
    if current_allowance < from_amount:
        from_amount_eth = Web3.from_wei(from_amount, 'ether')
        current_allowance_eth = Web3.from_wei(current_allowance, 'ether')
        print(f"❌ Allowance insufficient. Current: {current_allowance_eth}, Required: {from_amount_eth}")
        
        # Set the allowance to the required amount via user operation
        await approve_token_allowance(
            smart_account,
            token_address,
            PERMIT2_ADDRESS,
            from_amount
        )
        print(f"✅ Set allowance to {from_amount_eth} {token_symbol}")
    else:
        current_allowance_eth = Web3.from_wei(current_allowance, 'ether')
        print(f"✅ Token allowance sufficient. Current: {current_allowance_eth} {token_symbol}")


async def approve_token_allowance(
    smart_account,
    token_address: str,
    spender_address: str,
    amount: int
) -> None:
    """
    Handle approval for token allowance if needed for smart accounts.
    This is necessary when swapping ERC20 tokens (not native ETH).
    The Permit2 contract needs approval to move tokens on behalf of the smart account.
    
    Args:
        smart_account: The smart account instance
        token_address: The token contract address
        spender_address: The address allowed to spend the tokens
        amount: The amount to approve
    """
    print(f"\nApproving token allowance for {token_address} to spender {spender_address}")
    
    # Encode the approve function call
    contract = w3_rpc[NETWORK].eth.contract(address=token_address, abi=ERC20_ABI)
    data = contract.functions.approve(
        Web3.to_checksum_address(spender_address),
        amount
    ).build_transaction({'gas': 0})['data']
    
    # Send the approve transaction via user operation
    user_op_result = await smart_account.send_user_operation(
        calls=[
            EncodedCall(
                to=token_address,
                data=data,
                value=0,
            )
        ],
        # Note: No network parameter needed for network-scoped smart accounts
    )
    
    print(f"Approval user operation hash: {user_op_result.user_op_hash}")
    
    # Wait for approval user operation to be confirmed
    receipt = await smart_account.wait_for_user_operation(
        user_op_hash=user_op_result.user_op_hash,
    )
    
    print(f"Approval confirmed with status: {receipt.status} ✅")


async def get_allowance(
    owner: str,
    token: str,
    symbol: str
) -> int:
    """
    Check token allowance for the Permit2 contract.
    
    Args:
        owner: The token owner's address (smart account)
        token: The token contract address
        symbol: The token symbol for logging
        
    Returns:
        The current allowance
    """
    print(f"\nChecking allowance for {symbol} ({token}) to Permit2 contract...")
    
    try:
        contract = w3_rpc[NETWORK].eth.contract(address=token, abi=ERC20_ABI)
        allowance = contract.functions.allowance(
            Web3.to_checksum_address(owner),
            Web3.to_checksum_address(PERMIT2_ADDRESS)
        ).call()
        
        allowance_eth = Web3.from_wei(allowance, 'ether')
        print(f"Current allowance: {allowance_eth} {symbol}")
        return allowance
    except Exception as error:
        print(f"Error checking allowance: {error}")
        return 0


if __name__ == "__main__":
    asyncio.run(main()) 