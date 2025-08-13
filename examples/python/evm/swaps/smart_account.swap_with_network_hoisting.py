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

from cdp import CdpClient, EncodedCall
from cdp.actions.evm.swap.types import SmartAccountSwapOptions
from cdp.utils import parse_units
from dotenv import load_dotenv
from web3 import Web3

# Helper function to format units (not available in Python CDP SDK)
def format_units(amount: int, decimals: int) -> str:
    """Format an integer amount to a decimal string."""
    if decimals == 0:
        return str(amount)
    
    amount_str = str(amount)
    if len(amount_str) <= decimals:
        # Add leading zeros if needed
        amount_str = amount_str.zfill(decimals + 1)
    
    # Insert decimal point
    integer_part = amount_str[:-decimals] or "0"
    decimal_part = amount_str[-decimals:]
    
    # Remove trailing zeros from decimal part
    decimal_part = decimal_part.rstrip("0")
    
    if decimal_part:
        return f"{integer_part}.{decimal_part}"
    else:
        return integer_part

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
        "BRETT": {
            "address": "0x532f27101965dd16442E59d40670FaF5eBB142E4",
            "symbol": "BRETT",
            "decimals": 18,
            "is_native_asset": False,
        }
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
web3_clients = {
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
        network_smart_account = await base_smart_account.use_network(NETWORK)
        print(f"{NETWORK} smart account created: {network_smart_account.address}")

        # Example: swap DAI to USDC
        from_token = TOKENS[NETWORK]["DAI"]
        to_token = TOKENS[NETWORK]["USDC"]
        swap_amount = parse_units("0.01", from_token["decimals"])
        print(f"\n💱 Example: swap DAI to USDC...")
        print(f"Swap: {format_units(swap_amount, from_token['decimals'])} {from_token['symbol']} → {to_token['symbol']}")
        
        # Handle token allowance check and approval if needed (applicable when sending non-native assets only)
        if not from_token["is_native_asset"]:
            await handle_token_allowance(
                network_smart_account,
                from_token["address"],
                from_token["symbol"],
                swap_amount * 2  # since this example performs the swap twice consecutively
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
            
            if price_quote.liquidity_available:
                from_amount_formatted = format_units(price_quote.from_amount, from_token["decimals"])
                to_amount_formatted = format_units(price_quote.to_amount, to_token["decimals"])
                
                print(f"Price available on {NETWORK}:")
                print(f"Send: {from_amount_formatted} {from_token['symbol']}")
                print(f"Receive: {to_amount_formatted} {to_token['symbol']}")
                exchange_rate = float(to_amount_formatted) / float(from_amount_formatted)
                print(f"Exchange Rate: 1 {from_token['symbol']} = {exchange_rate:.6f} {to_token['symbol']}")
            else:
                print(f"No liquidity available for this pair on {NETWORK}")
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
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=swap_amount,
                slippage_bps=100,  # 1% slippage tolerance (100 basis points)
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


def display_swap_quote_details(swap_quote: Any, from_token: Dict[str, Any], to_token: Dict[str, Any]) -> None:
    """
    Displays detailed information about the swap quote
    """
    print("Smart Account Swap Quote Details:")
    print("================================")
    
    from_amount_formatted = format_units(swap_quote.from_amount, from_token["decimals"])
    to_amount_formatted = format_units(swap_quote.to_amount, to_token["decimals"])
    min_to_amount_formatted = format_units(swap_quote.min_to_amount, to_token["decimals"])
    
    print(f"📤 Sending: {from_amount_formatted} {from_token['symbol']}")
    print(f"📥 Receiving: {to_amount_formatted} {to_token['symbol']}")
    print(f"🔒 Minimum Receive: {min_to_amount_formatted} {to_token['symbol']}")
    print(f"🌐 Network: {NETWORK}")
    print(f"🔐 Smart Account: Yes (User Operation)")
    
    # Calculate exchange rate
    exchange_rate = (float(swap_quote.to_amount) / float(swap_quote.from_amount) * 
                    (10 ** (from_token["decimals"] - to_token["decimals"])))
    print(f"💱 Exchange Rate: 1 {from_token['symbol']} = {exchange_rate:.2f} {to_token['symbol']}")
    
    # Calculate slippage
    slippage_percent = ((float(swap_quote.to_amount) - float(swap_quote.min_to_amount)) / 
                       float(swap_quote.to_amount) * 100)
    print(f"📉 Max Slippage: {slippage_percent:.2f}%")
    
    # Gas information
    if hasattr(swap_quote, 'transaction') and swap_quote.transaction and hasattr(swap_quote.transaction, 'gas'):
        print(f"⛽ Estimated Gas: {swap_quote.transaction.gas:,}")
    
    # Fee information
    if hasattr(swap_quote, 'fees') and swap_quote.fees:
        if hasattr(swap_quote.fees, 'gas_fee') and swap_quote.fees.gas_fee:
            gas_fee_formatted = format_units(swap_quote.fees.gas_fee.amount, 18)  # ETH decimals
            print(f"💰 Gas Fee: {gas_fee_formatted} {swap_quote.fees.gas_fee.token}")
        
        if hasattr(swap_quote.fees, 'protocol_fee') and swap_quote.fees.protocol_fee:
            protocol_fee_decimals = (from_token["decimals"] if swap_quote.fees.protocol_fee.token == from_token["symbol"] 
                                   else to_token["decimals"])
            protocol_fee_formatted = format_units(swap_quote.fees.protocol_fee.amount, protocol_fee_decimals)
            print(f"🏛️ Protocol Fee: {protocol_fee_formatted} {swap_quote.fees.protocol_fee.token}")


def validate_swap_quote(swap_quote: Any) -> bool:
    """
    Validates the swap quote for any issues
    """
    print("Smart Account Validation Results:")
    print("================================")
    
    is_valid = True
    
    # Check liquidity
    if not swap_quote.liquidity_available:
        print("❌ Insufficient liquidity available")
        is_valid = False
    else:
        print("✅ Liquidity available")
    
    # Check balance issues
    if hasattr(swap_quote, 'issues') and swap_quote.issues and hasattr(swap_quote.issues, 'balance') and swap_quote.issues.balance:
        print("❌ Balance Issues:")
        print(f"   Current: {swap_quote.issues.balance.current_balance}")
        print(f"   Required: {swap_quote.issues.balance.required_balance}")
        print(f"   Token: {swap_quote.issues.balance.token}")
        is_valid = False
    else:
        print("✅ Sufficient balance")
    
    # Check allowance issues
    if hasattr(swap_quote, 'issues') and swap_quote.issues and hasattr(swap_quote.issues, 'allowance') and swap_quote.issues.allowance:
        print("❌ Allowance Issues:")
        print(f"   Current: {swap_quote.issues.allowance.current_allowance}")
        print(f"   Required: {swap_quote.issues.allowance.required_allowance}")
        print(f"   Spender: {swap_quote.issues.allowance.spender}")
        is_valid = False
    else:
        print("✅ Sufficient allowance")
    
    # Check simulation
    if hasattr(swap_quote, 'issues') and swap_quote.issues and hasattr(swap_quote.issues, 'simulation_incomplete') and swap_quote.issues.simulation_incomplete:
        print("⚠️ WARNING: Simulation incomplete - user operation may fail")
        # Not marking as invalid since this is just a warning
    else:
        print("✅ Simulation complete")
    
    return is_valid


async def handle_token_allowance(
    smart_account: Any,
    token_address: str,
    token_symbol: str,
    from_amount: int
) -> None:
    """
    Handles token allowance check and approval if needed for smart accounts
    """
    print(f"\n🔐 Checking smart account token allowance for {token_symbol}...")
    
    # Check allowance before attempting the swap
    current_allowance = await get_allowance(
        smart_account.address, 
        token_address,
        token_symbol
    )
    
    # If allowance is insufficient, approve tokens
    if current_allowance < from_amount:
        print(f"❌ Allowance insufficient. Current: {format_units(current_allowance, 18)}, Required: {format_units(from_amount, 18)}")
        
        # Set the allowance to the required amount via user operation
        await approve_token_allowance(
            smart_account,
            token_address,
            PERMIT2_ADDRESS,
            from_amount
        )
        print(f"✅ Set allowance to {format_units(from_amount, 18)} {token_symbol}")
    else:
        print(f"✅ Token allowance sufficient. Current: {format_units(current_allowance, 18)} {token_symbol}")


async def approve_token_allowance(
    smart_account: Any,
    token_address: str, 
    spender_address: str, 
    amount: int
):
    """
    Handle approval for token allowance if needed for smart accounts
    This is necessary when swapping ERC20 tokens (not native ETH)
    The Permit2 contract needs approval to move tokens on behalf of the smart account
    """
    print(f"\nApproving smart account token allowance for {token_address} to spender {spender_address}")
    
    # Encode the approve function call
    approve_data = Web3.keccak(text="approve(address,uint256)")[:4] + \
                   Web3.to_bytes(hexstr=spender_address[2:]).rjust(32, b'\x00') + \
                   amount.to_bytes(32, 'big')
    
    # Send the approve user operation (no network parameter needed for network-scoped smart account)
    user_op_result = await smart_account.send_user_operation(
        calls=[{
            "to": token_address,
            "data": approve_data.hex(),
            "value": 0,
        }],
    )
    
    print(f"Approval user operation hash: {user_op_result.user_op_hash}")
    
    # Wait for user operation completion
    receipt = await smart_account.wait_for_user_operation(
        user_op_hash=user_op_result.user_op_hash,
    )
    
    print(f"Approval confirmed with status: {receipt.status} ✅")
    return receipt


async def get_allowance(
    owner: str, 
    token: str,
    symbol: str
) -> int:
    """
    Check token allowance for the Permit2 contract
    """
    print(f"Checking allowance for {symbol} ({token}) to Permit2 contract...")
    
    try:
        web3_client = web3_clients[NETWORK]
        contract = web3_client.eth.contract(address=token, abi=ERC20_ABI)
        allowance = contract.functions.allowance(owner, PERMIT2_ADDRESS).call()
        
        print(f"Current allowance: {format_units(allowance, 18)} {symbol}")
        return allowance
    except Exception as error:
        print(f"Error checking allowance: {error}")
        return 0


# Run the example
if __name__ == "__main__":
    asyncio.run(main()) 