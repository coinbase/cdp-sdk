#!/usr/bin/env python3
"""Example of creating a swap transaction using CDP SDK."""

import asyncio
import os

from cdp import Cdp


async def main():
    """Create a swap transaction for ETH to USDC."""
    # Initialize CDP client
    api_key_name = os.environ.get("CDP_API_KEY_NAME")
    api_key_private_key = os.environ.get("CDP_API_KEY_PRIVATE_KEY")
    
    if not api_key_name or not api_key_private_key:
        raise ValueError("Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables")
    
    cdp = Cdp(api_key_name=api_key_name, api_key_private_key=api_key_private_key)
    
    # Example parameters
    from_address = "0x1234567890123456789012345678901234567890"  # Replace with actual address
    from_asset = "eth"
    to_asset = "usdc"
    amount = "1000000000000000000"  # 1 ETH in wei
    network = "base-sepolia"
    min_amount_out = "1990000000"  # Minimum 1990 USDC (with 0.5% slippage from expected 2000)
    
    print(f"Creating swap transaction...")
    print(f"From: {from_asset.upper()} -> To: {to_asset.upper()}")
    print(f"Amount: {amount} (smallest unit)")
    print(f"Network: {network}")
    print(f"From Address: {from_address}")
    print(f"Minimum output: {min_amount_out}")
    
    # Create the swap transaction
    swap_tx = await cdp.evm.create_swap(
        from_address=from_address,
        from_asset=from_asset,
        to_asset=to_asset,
        amount=amount,
        network=network,
        min_amount_out=min_amount_out,
    )
    
    print("\nSwap transaction created:")
    print(f"To: {swap_tx.to}")
    print(f"Data: {swap_tx.data}")
    print(f"Value: {swap_tx.value}")
    print(f"Transaction: {swap_tx.transaction}")
    
    # Example with quote ID (if you have one from get_quote)
    print("\n" + "="*50)
    print("Creating swap with quote ID...")
    
    # First get a quote
    quote = await cdp.evm.get_quote(
        from_asset=from_asset,
        to_asset=to_asset,
        amount=amount,
        network=network,
    )
    
    # Then create swap with the quote ID
    if quote.quote_id:
        swap_tx_with_quote = await cdp.evm.create_swap(
            from_address=from_address,
            from_asset=from_asset,
            to_asset=to_asset,
            amount=amount,
            network=network,
            min_amount_out=min_amount_out,
            quote_id=quote.quote_id,
        )
        
        print(f"Swap transaction created with quote ID: {quote.quote_id}")
        print(f"Transaction: {swap_tx_with_quote.transaction}")
    
    # Example with ERC20 tokens
    print("\n" + "="*50)
    print("Creating ERC20 to ERC20 swap...")
    
    usdc_to_weth_tx = await cdp.evm.create_swap(
        from_address=from_address,
        from_asset="usdc",
        to_asset="weth",
        amount="2000000000",  # 2000 USDC
        network=network,
        min_amount_out="990000000000000000",  # ~0.99 WETH with slippage
    )
    
    print("USDC to WETH swap transaction created:")
    print(f"To: {usdc_to_weth_tx.to}")
    print(f"Value: {usdc_to_weth_tx.value} (should be 0 for ERC20)")
    
    print("\nNote: These are mock transactions. In production, you would:")
    print("1. Sign the transaction with the account's private key")
    print("2. Send the signed transaction to the network")
    print("3. Wait for confirmation")


if __name__ == "__main__":
    asyncio.run(main()) 
