"""Example showing how to swap tokens using an EVM account."""

import asyncio
import os

from cdp import Cdp
from cdp.actions.evm.swap import CreateSwapOptions


async def main():
    """Swap tokens example."""
    # Initialize CDP SDK
    api_key_name = os.environ.get("CDP_API_KEY_NAME", "your-api-key-name")
    api_key_private_key = os.environ.get("CDP_API_KEY_PRIVATE_KEY", "your-api-key-private-key")
    
    cdp = Cdp(api_key_name=api_key_name, api_key_private_key=api_key_private_key)
    
    # Create or get an existing account
    print("Creating account...")
    account = await cdp.evm.create_account(name="swap-example-account")
    print(f"Account address: {account.address}")
    
    # Fund the account with some tokens (in production)
    # For testnet, you might use:
    # await account.request_faucet(network="base-sepolia", token="eth")
    
    print("\nNote: Make sure your account has sufficient balance before swapping!")
    
    # Define token addresses
    eth_address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"  # ETH (EIP-7528)
    usdc_base = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # USDC on Base
    weth_base = "0x4200000000000000000000000000000000000006"  # WETH on Base
    
    # Example 1: Swap ETH to USDC using CreateSwapOptions
    print("\n" + "="*50)
    print("Example 1: Swapping ETH to USDC...")
    
    try:
        swap_result = await account.swap(
            CreateSwapOptions(
                from_token=eth_address,
                to_token=usdc_base,
                amount="1000000000000000",  # 0.001 ETH
                network="base",
                slippage_percentage=0.5
            )
        )
        
        print(f"✅ Swap successful!")
        print(f"Transaction hash: {swap_result.transaction_hash}")
        print(f"Swapped {swap_result.from_amount} from {swap_result.from_token}")
        print(f"Received {swap_result.to_amount} to {swap_result.to_token}")
    except Exception as e:
        print(f"❌ Swap failed: {e}")
    
    # Example 2: Using dict syntax
    print("\n" + "="*50)
    print("Example 2: Using dict syntax for USDC to ETH...")
    
    try:
        swap_result2 = await account.swap({
            "from_token": usdc_base,
            "to_token": eth_address,
            "amount": "1000000",  # 1 USDC
            "network": "base",
            "slippage_percentage": 1.0
        })
        
        print(f"✅ Swap successful!")
        print(f"Transaction hash: {swap_result2.transaction_hash}")
    except Exception as e:
        print(f"❌ Swap failed: {e}")
    
    # Example 3: Using pre-created swap data
    print("\n" + "="*50)
    print("Example 3: Using pre-created swap data...")
    
    try:
        # First create the swap data using the EVM client
        from cdp.actions.evm.swap import SwapOptions
        
        # Create the swap
        swap_data = await cdp.evm.create_swap(
            from_token=usdc_base,
            to_token=weth_base,
            amount="500000000",  # 500 USDC
            network="base",
            wallet_address=account.address,
            slippage_percentage=0.5
        )
        
        # Execute using the pre-created data
        swap_result3 = await account.swap(
            SwapOptions(create_swap_result=swap_data)
        )
        
        print(f"✅ Swap successful!")
        print(f"Transaction hash: {swap_result3.transaction_hash}")
    except Exception as e:
        print(f"❌ Swap failed: {e}")
    
    print("\n" + "="*50)
    print("Done! Check the transaction hashes on the block explorer.")


if __name__ == "__main__":
    asyncio.run(main()) 
