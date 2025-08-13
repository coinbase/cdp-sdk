# Usage: uv run python evm/swaps/account.swap_with_network_hoisting.py

"""
This example demonstrates combining network hoisting with account swap functionality.
It shows how to use network scoping to connect to different networks and demonstrates
swap methods on these networks.

Network Hoisting allows you to create network-specific account instances from a base account
and switch between different networks seamlessly.

This example covers the following swap methods:
1. cdp.evm.get_swap_price() - Get swap price estimates
2. account.swap() - All-in-one swap execution (recommended for most use cases)
3. account.quote_swap() - Create quote, inspect, then execute

Networks Demonstrated:
- Optimism (optimism)
- Arbitrum (arbitrum)
"""

import asyncio
from decimal import Decimal
from typing import Dict, Any

from cdp import CdpClient, EncodedCall
from cdp.actions.evm.swap import AccountSwapOptions
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
    """Execute swaps on different networks using network hoisting."""
    print(f"Note: This example is using {NETWORK} network. Make sure you have funds available.")
    
    async with CdpClient() as cdp:
        # Create base account
        print(f"\nCreating base account...")
        base_account = await cdp.evm.get_or_create_account(name="networkHoistingSwap")
        print(f"Base account created: {base_account.address}")

        # Use network hoisting to create a network-scoped account
        print(f"\nCreating network-scoped account for {NETWORK}...")
        network_account = await base_account.use_network(NETWORK)
        print(f"{NETWORK} account created: {network_account.address}")

        # Example: swap DAI to USDC
        from_token = TOKENS[NETWORK]["DAI"]
        to_token = TOKENS[NETWORK]["USDC"]
        swap_amount = parse_units("0.01", from_token["decimals"])
        print(f"\n💱 Example: swap DAI to USDC...")
        print(f"Swap: {format_units(swap_amount, from_token['decimals'])} {from_token['symbol']} → {to_token['symbol']}")
        
        # Handle token allowance check and approval if needed (applicable when sending non-native assets only)
        if not from_token["is_native_asset"]:
            await handle_token_allowance(
                network_account.address,
                from_token["address"],
                from_token["symbol"],
                swap_amount * 2  # since this example performs the swap twice consecutively
            )
        
        # Example 1. get_swap_price()
        # This demonstrates the price estimation.
        print(f"\nExample 1: Getting swap price estimate...")
        try:
            price_quote = await cdp.evm.get_swap_price(
                network=NETWORK,
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=swap_amount,
                taker=network_account.address,
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

        # Example 2. account.swap()
        # This demonstrates the all-in-one swap execution.
        print(f"\nExample 2: Executing all-in-one swap...")
        print('Please uncomment the code below to execute the swap.')
        
        # Uncomment below to execute actual swap (requires sufficient balance and allowances)
        """
        try:
            result = await network_account.swap(
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=swap_amount,
                slippage_bps=100,  # 1% slippage tolerance (100 basis points)
            )
            
            print(f"Swap executed successfully on {NETWORK}:")
            print(f"Transaction Hash: {result.transaction_hash}")
            print(f"Waiting for confirmation...")
                
            # Wait for transaction confirmation using Web3
            web3_client = web3_clients[NETWORK]
            receipt = web3_client.eth.wait_for_transaction_receipt(result.transaction_hash)
                
            print("\nSwap Transaction Confirmed!")
            print(f"Block number: {receipt.blockNumber}")
            print(f"Gas used: {receipt.gasUsed}")
            print(f"Status: {'Success ✅' if receipt.status == 1 else 'Failed ❌'}")
            if NETWORK == 'optimism':
                print(f"Transaction Explorer: https://explorer.optimism.io/tx/{result.transaction_hash}")
            elif NETWORK == 'arbitrum':
                print(f"Transaction Explorer: https://arbiscan.io/tx/{result.transaction_hash}")
        except Exception as error:
            print(f"Failed to swap on {NETWORK}: {error}")
        """

        # Example 3. account.quote_swap() + execute
        # This demonstrates the quote-then-execute pattern for more control.
        print(f"\nExample 3: Quote-then-execute pattern...")
        try:
            # 1. Create the quote
            print(f"\nStep 1: Creating swap quote...")
            swap_quote = await network_account.quote_swap(
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=swap_amount,
                slippage_bps=100,  # 1% slippage tolerance (100 basis points)
            )
            
            if not swap_quote.liquidity_available:
                print(f"No liquidity available for this pair on {NETWORK}")
                return
            
            # 2. Inspect the quote details
            print(f"\nStep 2: Inspecting quote details...")
            display_swap_quote_details(swap_quote, from_token, to_token)
            
            # 3. Validate the swap quote
            print(f"\nStep 3: Validating swap quote...")
            is_valid = validate_swap_quote(swap_quote)
            
            if not is_valid:
                print(f"❌ Swap quote validation failed. Please check the issues above.")
                return
            
            # 4. Execute (commented out for demo)
            print(f"\nStep 4: Execute swap (DEMO ONLY)")
            print('Please uncomment the code below to execute the swap.')
            
            # Uncomment to actually execute:
            """
            result = await swap_quote.execute()
            print(f"Transaction Hash: {result.transaction_hash}")
            print(f"Waiting for confirmation...")
                
            # Wait for transaction confirmation using Web3
            web3_client = web3_clients[NETWORK]
            receipt = web3_client.eth.wait_for_transaction_receipt(result.transaction_hash)
                
            print("\nSwap Transaction Confirmed!")
            print(f"Block number: {receipt.blockNumber}")
            print(f"Gas used: {receipt.gasUsed}")
            print(f"Status: {'Success ✅' if receipt.status == 1 else 'Failed ❌'}")
            if NETWORK == 'optimism':
                print(f"Transaction Explorer: https://explorer.optimism.io/tx/{result.transaction_hash}")
            elif NETWORK == 'arbitrum':
                print(f"Transaction Explorer: https://arbiscan.io/tx/{result.transaction_hash}")
            """
            
        except Exception as error:
            print(f"Quote and execute pattern failed on {NETWORK}: {error}")


def display_swap_quote_details(swap_quote: Any, from_token: Dict[str, Any], to_token: Dict[str, Any]) -> None:
    """
    Displays detailed information about the swap quote
    """
    print("Swap Quote Details:")
    print("==================")
    
    from_amount_formatted = format_units(swap_quote.from_amount, from_token["decimals"])
    to_amount_formatted = format_units(swap_quote.to_amount, to_token["decimals"])
    min_to_amount_formatted = format_units(swap_quote.min_to_amount, to_token["decimals"])
    
    print(f"📤 Sending: {from_amount_formatted} {from_token['symbol']}")
    print(f"📥 Receiving: {to_amount_formatted} {to_token['symbol']}")
    print(f"🔒 Minimum Receive: {min_to_amount_formatted} {to_token['symbol']}")
    print(f"🌐 Network: {NETWORK}")
    
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
    print("Validation Results:")
    print("==================")
    
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
        print("⚠️ WARNING: Simulation incomplete - transaction may fail")
        # Not marking as invalid since this is just a warning
    else:
        print("✅ Simulation complete")
    
    return is_valid


async def handle_token_allowance(
    owner_address: str, 
    token_address: str,
    token_symbol: str,
    from_amount: int
) -> None:
    """
    Handles token allowance check and approval if needed
    """
    print(f"\n🔐 Checking token allowance for {token_symbol}...")
    
    # Check allowance before attempting the swap
    current_allowance = await get_allowance(
        owner_address, 
        token_address,
        token_symbol
    )
    
    # If allowance is insufficient, approve tokens
    if current_allowance < from_amount:
        print(f"❌ Allowance insufficient. Current: {format_units(current_allowance, 18)}, Required: {format_units(from_amount, 18)}")
        
        # Set the allowance to the required amount
        await approve_token_allowance(
            owner_address,
            token_address,
            PERMIT2_ADDRESS,
            from_amount
        )
        print(f"✅ Set allowance to {format_units(from_amount, 18)} {token_symbol}")
    else:
        print(f"✅ Token allowance sufficient. Current: {format_units(current_allowance, 18)} {token_symbol}, Required: {format_units(from_amount, 18)} {token_symbol}")


async def approve_token_allowance(
    owner_address: str, 
    token_address: str, 
    spender_address: str, 
    amount: int
):
    """
    Handle approval for token allowance if needed
    This is necessary when swapping ERC20 tokens (not native ETH)
    The Permit2 contract needs approval to move tokens on your behalf
    """
    print(f"\nApproving token allowance for {token_address} to spender {spender_address}")
    
    # Create the approve function call data
    approve_call = EncodedCall(
        to=token_address,
        data=Web3.keccak(text="approve(address,uint256)")[:4] + 
             Web3.to_bytes(hexstr=spender_address[2:]).rjust(32, b'\x00') +
             amount.to_bytes(32, 'big'),
        value=0,
    )
    
    async with CdpClient() as cdp:
        # Send the approve transaction
        tx_result = await cdp.evm.send_transaction(
            address=owner_address,
            network=NETWORK,
            transaction={
                "to": token_address,
                "data": approve_call.data.hex(),
                "value": 0,
            },
        )
        
        print(f"Approval transaction hash: {tx_result.transaction_hash}")
        
        # Wait for approval transaction to be confirmed
        web3_client = web3_clients[NETWORK]
        receipt = web3_client.eth.wait_for_transaction_receipt(tx_result.transaction_hash)
        
        print(f"Approval confirmed in block {receipt.blockNumber} ✅")
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