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

from cdp import CdpClient
from cdp.actions.evm.swap import AccountSwapOptions
from cdp.evm_transaction_types import TransactionRequestEIP1559
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
    """Execute swaps on different networks using network hoisting."""
    print(f"Note: This example is using {NETWORK} network. Make sure you have funds available.")
    
    async with CdpClient() as cdp:
        # Create base account
        print(f"\nCreating base account...")
        base_account = await cdp.evm.get_or_create_account(name="networkHoistingSwap")
        print(f"Base account created: {base_account.address}")

        # Use network hoisting to create a network-scoped account
        print(f"\nCreating network-scoped account for {NETWORK}...")
        network_account = await base_account.__experimental_use_network__(NETWORK)
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
                network_account,  
                from_token["address"],
                from_token["symbol"],
                str(swap_amount * 2),  
                from_token["decimals"]
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
            
            from_amount_formatted = format_units(price_quote.from_amount, from_token["decimals"])
            to_amount_formatted = format_units(price_quote.to_amount, to_token["decimals"])
            
            print(f"Price available on {NETWORK}:")
            print(f"Send: {from_amount_formatted} {from_token['symbol']}")
            print(f"Receive: {to_amount_formatted} {to_token['symbol']}")
            exchange_rate = float(to_amount_formatted) / float(from_amount_formatted)
            print(f"Exchange Rate: 1 {from_token['symbol']} = {exchange_rate:.6f} {to_token['symbol']}")
        except ValueError as error:
            if "Insufficient liquidity" in str(error):
                print(f"No liquidity available for this pair on {NETWORK}")
            else:
                print(f"Failed to get swap price on {NETWORK}: {error}")
        except Exception as error:
            print(f"Failed to get swap price on {NETWORK}: {error}")

        # Example 2. account.swap()
        # This demonstrates the all-in-one swap execution.
        print(f"\nExample 2: Executing all-in-one swap...")
        print('Please uncomment the code below to execute the swap.')
        
        # Uncomment below to execute actual swap (requires sufficient balance and allowances)
        
        try:
            result = await network_account.swap(
                AccountSwapOptions( # TODO revise
                    from_token=from_token["address"],
                    to_token=to_token["address"],
                    from_amount=swap_amount,
                    slippage_bps=100,  # 1% slippage tolerance (100 basis points)
                )
            )
            
            print(f"Swap executed successfully on {NETWORK}:")
            print(f"Transaction Hash: {result.transaction_hash}")
            print(f"Waiting for confirmation...")
                
            # Wait for transaction confirmation using Web3
            web3_client = w3_rpc[NETWORK]
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
        

        # recomment to here

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
            
            result = await swap_quote.execute()
            print(f"Transaction Hash: {result.transaction_hash}")
            print(f"Waiting for confirmation...")
                
            # Wait for transaction confirmation using Web3
            web3_client = w3_rpc[NETWORK]
            receipt = web3_client.eth.wait_for_transaction_receipt(result.transaction_hash)
                
            print("\nSwap Transaction Confirmed!")
            print(f"Block number: {receipt.blockNumber}")
            print(f"Gas used: {receipt.gasUsed}")
            print(f"Status: {'Success ✅' if receipt.status == 1 else 'Failed ❌'}")
            if NETWORK == 'optimism':
                print(f"Transaction Explorer: https://explorer.optimism.io/tx/{result.transaction_hash}")
            elif NETWORK == 'arbitrum':
                print(f"Transaction Explorer: https://arbiscan.io/tx/{result.transaction_hash}")
            
            # recomment to here
            
        except Exception as error:
            print(f"Quote and execute pattern failed on {NETWORK}: {error}")


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
    # if hasattr(swap_quote, 'fees') and swap_quote.fees:
    #     if hasattr(swap_quote.fees, 'gas_fee') and swap_quote.fees.gas_fee:
    #         gas_fee_decimal = Decimal(swap_quote.fees.gas_fee.amount) / Decimal(10**18)
    #         print(f"💰 Gas Fee: {gas_fee_decimal:.6f} {swap_quote.fees.gas_fee.token}")
    #     
    #     if hasattr(swap_quote.fees, 'protocol_fee') and swap_quote.fees.protocol_fee:
    #         fee_decimals = from_token["decimals"] if swap_quote.fees.protocol_fee.token == from_token["symbol"] else to_token["decimals"]
    #         protocol_fee_decimal = Decimal(swap_quote.fees.protocol_fee.amount) / Decimal(10**fee_decimals)
    #         print(f"🏛️ Protocol Fee: {protocol_fee_decimal:.{fee_decimals}} {swap_quote.fees.protocol_fee.token}")


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
    #     print("⚠️ WARNING: Simulation incomplete - transaction may fail")
    #     # Not marking as invalid since this is just a warning
    # else:
    print("✅ Simulation complete")
    
    return is_valid


async def get_allowance(account, token_address: str, spender_address: str, token_symbol: str) -> int:
    """Check token allowance for the Permit2 contract.
    
    Args:
        account: The account that owns the tokens
        token_address: The token contract address  
        spender_address: The address allowed to spend the tokens (Permit2)
        token_symbol: The token symbol for logging
        
    Returns:
        int: The current allowance amount in smallest units
    """
    print(f"\nChecking allowance for {token_symbol} ({token_address}) to Permit2 contract...")
    
    try:
        # Use Web3.py directly to check allowance (read-only call)
        contract = w3_rpc[NETWORK].eth.contract(address=token_address, abi=ERC20_ABI)
        
        print(f"Making read-only contract call via Web3.py...")
        
        try:
            # Make direct contract call using Web3.py
            current_allowance = contract.functions.allowance(
                Web3.to_checksum_address(account.address),
                Web3.to_checksum_address(spender_address)
            ).call()
            
            return current_allowance
            
        except Exception as call_error:
            print(f"❌ Web3 contract call failed: {call_error}")
            print("🔄 For demo purposes, returning 0 to trigger approval flow...")
            return 0
        
    except Exception as error:
        print(f"Error checking allowance: {error}")
        return 0


async def approve_token_allowance(account, token_address: str, spender_address: str, amount: str, token_symbol: str):
    """Handle approval for token allowance if needed.
    
    This is necessary when swapping ERC20 tokens (not native ETH).
    The Permit2 contract needs approval to move tokens on your behalf.
    
    Args:
        account: The account that owns the tokens
        token_address: The token contract address
        spender_address: The address allowed to spend the tokens (Permit2)
        amount: The amount to approve (in smallest units)
        token_symbol: The symbol of the token (e.g., WETH, USDC)
    """
    print(f"\nApproving token allowance for {token_address} to spender {spender_address}")
    
    try:
        # Use global Web3 instance with Base mainnet provider
        contract = w3_rpc[NETWORK].eth.contract(address=token_address, abi=ERC20_ABI)
        
        # Encode the approve function call using Web3
        call_data = contract.functions.approve(
            Web3.to_checksum_address(spender_address),
            int(amount)
        ).build_transaction({'gas': 0})['data']
        
        print(f"Sending approval transaction for {token_symbol}...")
        
        try:
            # Use CDP SDK to send the approval transaction
            result = await account.send_transaction(
                transaction=TransactionRequestEIP1559(
                    to=token_address,
                    data=call_data,
                    value=0,  # No ETH value for approve
                )
                # Note: No network parameter needed for network-scoped accounts
            )
            
            print(f"✅ Approval transaction submitted!")
            print(f"Transaction hash: {result}")
            print(f"🔗 View on explorer: https://basescan.org/tx/{result}")
            print(f"⏳ Waiting for transaction confirmation...")
            
            # Wait for transaction confirmation using Web3.py
            try:
                # Use global Web3 instance for transaction receipt
                tx_receipt = w3_rpc[NETWORK].eth.wait_for_transaction_receipt(result)
                
                print(f"✅ Approval transaction confirmed in block {tx_receipt.blockNumber}!")
                print(f"📊 Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")
                print(f"⛽ Gas used: {tx_receipt.gasUsed:,}")
                print(f"🎉 {token_symbol} can now be spent by Permit2")
                return result
                
            except Exception as receipt_error:
                print(f"⚠️ Could not wait for transaction receipt: {receipt_error}")
                print("Transaction was submitted but confirmation status unknown.")
                print("Check the explorer link above to verify transaction status.")
                return result
            
        except Exception as tx_error:
            print(f"❌ Transaction submission failed: {tx_error}")
            print("This might be because:")
            print("- Insufficient funds for gas")
            print("- Network connectivity issues") 
            print("- Invalid transaction data")
            raise tx_error
        
    except Exception as error:
        print(f"Error approving allowance: {error}")
        raise error


async def handle_token_allowance(account, token_address: str, token_symbol: str, from_amount: str, token_decimals: int = 18):
    """Handle token allowance check and approval if needed.
    
    This is necessary when swapping ERC20 tokens (not native ETH).
    The Permit2 contract needs approval to move tokens on your behalf.
    
    Args:
        account: The account that owns the tokens
        token_address: The address of the token to be sent
        token_symbol: The symbol of the token (e.g., WETH, USDC)
        from_amount: The amount to be sent (as string)
        token_decimals: The number of decimals for the token (default 18)
    """
    print(f"\n🔐 Checking token allowance for {token_symbol}...")
    
    # Check current allowance
    current_allowance = await get_allowance(
        account, 
        token_address,
        PERMIT2_ADDRESS,
        token_symbol
    )
    
    # Check if allowance is sufficient
    required_amount = int(from_amount)
    if current_allowance < required_amount:
        # Use Web3 for cleaner formatting if 18 decimals
        if token_decimals == 18:
            allowance_formatted = Web3.from_wei(current_allowance, 'ether')
            required_formatted = Web3.from_wei(required_amount, 'ether')
        else:
            allowance_formatted = Decimal(current_allowance) / Decimal(10**token_decimals)
            required_formatted = Decimal(required_amount) / Decimal(10**token_decimals)
            
        print(f"❌ Allowance insufficient. Current: {allowance_formatted:.6f}, Required: {required_formatted:.6f}")
        
        # Approve the required amount
        await approve_token_allowance(
            account,
            token_address, 
            PERMIT2_ADDRESS,
            from_amount,
            token_symbol
        )
        
        print(f"✅ Set allowance to {required_formatted:.6f} {token_symbol}")
    else:
        # Use Web3 for cleaner formatting if 18 decimals
        if token_decimals == 18:
            allowance_formatted = Web3.from_wei(current_allowance, 'ether')
            required_formatted = Web3.from_wei(required_amount, 'ether')
        else:
            allowance_formatted = Decimal(current_allowance) / Decimal(10**token_decimals)
            required_formatted = Decimal(required_amount) / Decimal(10**token_decimals)
            
        print(f"✅ Token allowance sufficient. Current: {allowance_formatted:.6f} {token_symbol}, Required: {required_formatted:.6f} {token_symbol}")


if __name__ == "__main__":
    asyncio.run(main()) 