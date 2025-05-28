"""Example of swapping tokens using a smart account with gasless transactions."""

import asyncio
from cdp import CdpClient
from cdp.actions.evm.swap import SwapOptions


async def main():
    # Initialize CDP client
    cdp = CdpClient.from_json("~/.cdp/credentials.json")
    
    # Create an owner account for the smart account
    owner = await cdp.evm.create_account(name="smart-account-owner")
    print(f"Created owner account: {owner.address}")
    
    # Create a smart account
    smart_account = await cdp.evm.create_smart_account(owner=owner)
    print(f"Created smart account: {smart_account.address}")
    
    # Request some ETH to the smart account from faucet
    print("\nRequesting ETH from faucet...")
    tx_hash = await cdp.evm.request_faucet(
        address=smart_account.address,
        network="base-sepolia",
        token="eth"
    )
    print(f"Faucet transaction: {tx_hash}")
    
    # Wait a bit for the faucet transaction to be confirmed
    print("Waiting for faucet transaction to confirm...")
    await asyncio.sleep(10)
    
    # Swap 0.001 ETH to USDC using gasless transaction
    print("\nSwapping 0.001 ETH to USDC (gasless)...")
    swap_result = await smart_account.swap(
        SwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="0.001",  # 0.001 ETH
            network="base-sepolia",
            slippage_percentage=1.0,  # 1% slippage tolerance
        )
    )
    
    print(f"Swap completed!")
    print(f"User operation hash: {swap_result.transaction_hash}")
    print(f"Swapped {swap_result.from_amount} {swap_result.from_asset} for {swap_result.to_amount} {swap_result.to_asset}")
    print(f"Status: {swap_result.status}")
    
    # Example of swapping USDC to WETH (also gasless)
    print("\nSwapping USDC to WETH (gasless)...")
    swap_weth_result = await smart_account.swap({
        "from_asset": "usdc",
        "to_asset": "weth",
        "amount": "1000000",  # 1 USDC in smallest unit (6 decimals)
        "network": "base-sepolia",
        "slippage_percentage": 0.5,
    })
    
    print(f"Swap to WETH completed!")
    print(f"User operation hash: {swap_weth_result.transaction_hash}")
    print(f"Status: {swap_weth_result.status}")


if __name__ == "__main__":
    asyncio.run(main()) 