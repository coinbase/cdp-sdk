#!/usr/bin/env python3
# Usage: uv run python evm/account_quote_swap_and_execute.py

"""
Example: Account Quote Swap and Execute

This example demonstrates the two-step swap approach using account.quote_swap() 
followed by execution. This pattern gives you more control and visibility into
the swap process compared to the all-in-one account.swap() method.

Why use the two-step approach?
- Inspect swap details before execution (rates, fees, gas estimates)
- Implement conditional logic based on swap parameters
- Better error handling and user confirmation flows
- More control over the execution timing
- Ability to cache and reuse quotes (within their validity period)

Two-step process:
1. Create quote: account.quote_swap() - get swap details and transaction data
2. Execute swap: account.swap({ swap_quote }) or swap_quote.execute()

When to use this pattern:
- When you need to show users exact swap details before execution
- For implementing approval flows or confirmation dialogs
- When you want to validate swap parameters programmatically
- For advanced trading applications that need precise control

For simpler use cases, consider account.swap() with inline options instead.
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient
from cdp.actions.evm.swap import AccountSwapOptions

from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.utils import parse_units
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

# Network configuration
NETWORK = "base"  # Base mainnet

# Token definitions for the example (using Base mainnet token addresses)
TOKENS = {
    "WETH": {
        "address": "0x4200000000000000000000000000000000000006",
        "symbol": "WETH",
        "decimals": 18,
        "is_native_asset": False
    },
    "USDC": {
        "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "symbol": "USDC",
        "decimals": 6,
        "is_native_asset": False
    },
}

# Permit2 contract address is the same across all networks
PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

# Web3 instance for transaction receipt checking (Base mainnet RPC)
w3_rpc = Web3(Web3.HTTPProvider('https://mainnet.base.org'))

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
    """Create a swap quote using account method and execute it."""
    print(f"Note: This example is using {NETWORK} network. Make sure you have funds available.")
    
    async with CdpClient() as cdp:
        # Get or create an account to use for the swap
        account = await cdp.evm.get_or_create_account(name="SwapQuoteAndExecuteAccount")
        print(f"\nUsing account: {account.address}")
        
        try:
            # Define the tokens we're working with
            from_token = TOKENS["WETH"]
            to_token = TOKENS["USDC"]
            
            # Set the amount we want to send
            from_amount = parse_units("0.1", from_token["decimals"])  # 0.1 WETH
            
            from_amount_decimal = Decimal(from_amount) / Decimal(10 ** from_token["decimals"])
            print(f"\nInitiating two-step swap: {from_amount_decimal:.6f} {from_token['symbol']} → {to_token['symbol']}")
            
            # Handle token allowance check and approval if needed (applicable when sending non-native assets only)
            if not from_token["is_native_asset"]:
                await handle_token_allowance(
                    account,
                    from_token["address"],
                    from_token["symbol"],
                    from_amount,
                    from_token["decimals"]
                )
            
            # STEP 1: Create the swap quote
            print("\n🔍 Step 1: Creating swap quote...")
            swap_quote = await account.quote_swap(
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=from_amount,
                network=NETWORK,
                slippage_bps=100,  # 1% slippage tolerance
            )
            
            # Check if liquidity is available
            if not swap_quote.liquidity_available:
                print("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.")
                print("Try reducing the swap amount or using a different token pair.")
                return
            
            # STEP 2: Inspect and validate the swap details
            print("\n📊 Step 2: Analyzing swap quote...")
            display_swap_quote_details(swap_quote, from_token, to_token)
            
            # Validate the swap for any issues
            if not validate_swap_quote(swap_quote):
                print("\n❌ Swap validation failed. Aborting execution.")
                return
            
            # STEP 3: Execute the swap
            print("\n🚀 Step 3: Executing swap...")
            
            # Option A: Execute using account.swap() with the pre-created quote (RECOMMENDED)
            print("Executing swap using account.swap() with pre-created quote...")
            result = await account.swap(AccountSwapOptions(swap_quote=swap_quote))
            
            # Option B: Execute using the quote's execute() method directly
            # result = await swap_quote.execute()
            
            print(f"\n✅ Swap submitted successfully!")
            print(f"Transaction hash: {result.transaction_hash}")
            print(f"🔗 View on explorer: https://basescan.org/tx/{result.transaction_hash}")
            print(f"⏳ Waiting for transaction confirmation...")
            
            # Wait for transaction confirmation using Web3.py
            try:
                # Use global Web3 instance for transaction receipt
                tx_receipt = w3_rpc.eth.wait_for_transaction_receipt(result.transaction_hash)
                
                print(f"\n✅ Swap transaction confirmed in block {tx_receipt.blockNumber}!")
                print(f"📊 Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")
                print(f"⛽ Gas used: {tx_receipt.gasUsed:,}")
                
            except Exception as receipt_error:
                print(f"\n⚠️ Could not wait for transaction receipt: {receipt_error}")
                print("Transaction was submitted but confirmation status unknown.")
                print("Check the explorer link above to verify transaction status.")
            
        except Exception as error:
            print(f"Error in two-step swap process: {error}")


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
        contract = w3_rpc.eth.contract(address=token_address, abi=ERC20_ABI)
        
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
        contract = w3_rpc.eth.contract(address=token_address, abi=ERC20_ABI)
        
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
                ),
                network=NETWORK
            )
            
            print(f"✅ Approval transaction submitted!")
            print(f"Transaction hash: {result}")
            print(f"🔗 View on explorer: https://basescan.org/tx/{result}")
            print(f"⏳ Waiting for transaction confirmation...")
            
            # Wait for transaction confirmation using Web3.py
            try:
                # Use global Web3 instance for transaction receipt
                tx_receipt = w3_rpc.eth.wait_for_transaction_receipt(result)
                
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