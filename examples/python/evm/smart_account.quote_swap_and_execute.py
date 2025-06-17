#!/usr/bin/env python3
# Usage: uv run python evm/smart_account.quote_swap_and_execute.py

"""
Example: Smart Account Quote Swap and Execute

This example demonstrates the two-step swap approach using smart_account.quote_swap() 
followed by execution. This pattern gives you more control and visibility into
the swap process compared to the all-in-one smart_account.swap() method.

Why use the two-step approach?
- Inspect swap details before execution (rates, fees, gas estimates)
- Implement conditional logic based on swap parameters
- Better error handling and user confirmation flows
- More control over the execution timing
- Ability to cache and reuse quotes (within their validity period)

Two-step process:
1. Create quote: smart_account.quote_swap() - get swap details and user operation data
2. Execute swap: smart_account.swap({ swap_quote }) or swap_quote.execute()

When to use this pattern:
- When you need to show users exact swap details before execution
- For implementing approval flows or confirmation dialogs
- When you want to validate swap parameters programmatically
- For advanced trading applications that need precise control

Smart account specific considerations:
- Smart account address is used as the taker (it owns the tokens)
- Owner signs permit2 messages (not the smart account itself)
- Uses send_swap_operation → send_user_operation instead of send_swap_transaction
- Returns user operation hash instead of transaction hash
- Supports paymaster for gas sponsorship

For simpler use cases, consider smart_account.swap() with inline options instead.
"""

import asyncio
from decimal import Decimal

from cdp import CdpClient, EncodedCall
from cdp.actions.evm.swap import SmartAccountSwapOptions

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

# Web3 instance for transaction monitoring (Base mainnet RPC)
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
    """Create a swap quote using smart account method and execute it."""
    print(f"Note: This example is using {NETWORK} network with smart accounts. Make sure you have funds available.")
    
    async with CdpClient() as cdp:
        # Create an owner account for the smart account
        owner_account = await cdp.evm.get_or_create_account(name="SmartAccountOwner")
        print(f"Owner account: {owner_account.address}")

        # Get or create a smart account to use for the swap
        smart_account = await cdp.evm.get_or_create_smart_account(owner=owner_account, name="SmartAccount")
        print(f"\nUsing smart account: {smart_account.address}")
        
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
                    smart_account,
                    from_token["address"],
                    from_token["symbol"],
                    from_amount
                )
            
            # STEP 1: Create the swap quote
            print("\n🔍 Step 1: Creating swap quote...")
            swap_quote = await smart_account.quote_swap(
                from_token=from_token["address"],
                to_token=to_token["address"],
                from_amount=from_amount,
                network=NETWORK,
                slippage_bps=100,  # 1% slippage tolerance
                # Optional: paymaster_url="https://paymaster.example.com"  # For gas sponsorship
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
            
            # Option A: Execute using smart_account.swap() with the pre-created quote (RECOMMENDED)
            print("Executing swap using smart_account.swap() with pre-created quote...")
            result = await smart_account.swap(SmartAccountSwapOptions(swap_quote=swap_quote))
            
            # Option B: Execute using the quote's execute() method directly
            # print("Executing swap using swap_quote.execute()...")
            # result = await swap_quote.execute()
            
            print(f"\n✅ Smart account swap submitted successfully!")
            print(f"User operation hash: {result.user_op_hash}")
            print(f"Smart account address: {result.smart_account_address}")
            print(f"Status: {result.status}")
            print(f"🔗 View on explorer: https://basescan.org/tx/{result.user_op_hash}")
            print(f"⏳ Waiting for user operation confirmation...")
            
            # Wait for user operation completion
            receipt = await smart_account.wait_for_user_operation(
                user_op_hash=result.user_op_hash,
                timeout_seconds=60,
            )

            print(f"\n🎉 Smart Account Swap User Operation Completed!")
            print(f"Final status: {receipt.status}")
            
            if receipt.status == "complete":
                print(f"✅ Swap completed successfully!")
                print(f"Transaction Explorer: https://basescan.org/tx/{result.user_op_hash}")
            
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
    contract = w3_rpc.eth.contract(address=token_address, abi=ERC20_ABI)
    data = contract.functions.approve(
        Web3.to_checksum_address(spender_address),
        amount
    ).build_transaction({'gas': 0})['data']
    
    # Send the approve transaction via user operation
    user_op_result = await smart_account.send_user_operation(
        network=NETWORK,
        calls=[
            EncodedCall(
                to=token_address,
                data=data,
                value=0,
            )
        ],
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
        contract = w3_rpc.eth.contract(address=token, abi=ERC20_ABI)
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