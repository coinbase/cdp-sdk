#!/usr/bin/env python3
"""Example showing how to create a swap transaction."""

import asyncio
import os

from cdp import Cdp, EvmClient
from cdp.actions.evm.swap import CreateSwapResult, SwapTransaction


async def main():
    """Create a swap transaction example."""
    # Initialize CDP client
    api_key_name = os.environ.get("CDP_API_KEY_NAME")
    api_key_private_key = os.environ.get("CDP_API_KEY_PRIVATE_KEY")
    
    if not api_key_name or not api_key_private_key:
        raise ValueError("Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables")
    
    cdp = Cdp(api_key_name=api_key_name, api_key_private_key=api_key_private_key, debug_mode=True)
    
    # Create an EVM client
    evm_client = EvmClient(cdp.api_clients)
    
    # Define swap parameters
    # ETH address on Base (EIP-7528 standard)
    eth_address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    # USDC address on Base
    usdc_address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    
    amount = "1000000000000000"  # 0.001 ETH in wei
    network = "base"
    wallet_address = "0x0000000000000000000000000000000000000000"  # Replace with actual wallet
    slippage_percentage = 1.0

    print(f"Creating swap transaction...")
    print(f"From: ETH ({eth_address})")
    print(f"To: USDC ({usdc_address})")
    print(f"Amount: {amount} wei")
    print(f"Network: {network}")
    print(f"Wallet: {wallet_address}")
    print(f"Slippage: {slippage_percentage}%")

    # Example 1: Simple swap
    try:
        swap_tx = await evm_client.create_swap(
            from_token=eth_address,
            to_token=usdc_address,
            amount=amount,
            network=network,
            wallet_address=wallet_address,
            slippage_percentage=slippage_percentage,
        )
        print("\n✅ Swap transaction created:")
        print(f"To: {swap_tx.to}")
        print(f"Value: {swap_tx.value} wei")
        print(f"Requires signature: {swap_tx.requires_signature}")
        if swap_tx.permit2_data:
            print("Permit2 signature required")
    except Exception as e:
        print(f"❌ Failed to create swap: {e}")

    # Example 2: USDC to ETH swap
    try:
        print("\n\nExample 2: USDC to ETH swap...")
        swap_tx2 = await evm_client.create_swap(
            from_token=usdc_address,
            to_token=eth_address,
            amount="100000000",  # 100 USDC (6 decimals)
            network=network,
            wallet_address=wallet_address,
            slippage_percentage=0.5,  # Lower slippage
        )
        print("✅ Swap created")
    except Exception as e:
        print(f"❌ Failed: {e}")

    # Example 3: Swapping on Ethereum mainnet
    try:
        print("\n\nExample 3: Swap on Ethereum mainnet...")
        # Addresses on Ethereum mainnet
        usdc_eth = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        weth_eth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        
        swap_tx3 = await evm_client.create_swap(
            from_token=usdc_eth,
            to_token=weth_eth,
            amount="1000000",  # 1 USDC
            network="ethereum",
            wallet_address=wallet_address,
            slippage_percentage=1.0,
        )
        print("✅ ERC20 to ERC20 swap created")
        if swap_tx3.requires_signature:
            print("This swap requires a Permit2 signature")
    except Exception as e:
        print(f"❌ Failed: {e}")

    # Example of how to use the swap transaction
    print("\n📝 To execute this swap:")
    print("1. If requires_signature is True, sign the Permit2 data")
    print("2. Send the transaction to the blockchain")
    print("3. Monitor the transaction hash for confirmation")

    # Example 4: Handling CreateSwapResult
    try:
        # This would normally come from the API
        swap_result = CreateSwapResult(
            quote_id="example-quote-id",
            from_token=usdc_address,
            to_token="0x4200000000000000000000000000000000000006",  # WETH on Base
            from_amount="1000000",
            to_amount="500000000000000",
            to="0x00000000",
            data="0x...",
            value="0",
        )
        print("\n✅ CreateSwapResult can be used with account.swap()")
    except Exception as e:
        print(f"❌ Failed: {e}")

    print("\nNote: These are mock transactions. In production, you would:")
    print("1. Sign the transaction with the account's private key")
    print("2. Send the signed transaction to the network")
    print("3. Wait for confirmation")


if __name__ == "__main__":
    asyncio.run(main()) 
