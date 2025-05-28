"""Example of swapping tokens using a regular EVM account."""

import asyncio
from cdp import CdpClient
from cdp.actions.evm.swap import SwapOptions


async def main():
    # Initialize CDP client
    cdp = CdpClient.from_json("~/.cdp/credentials.json")
    
    # Create or get an account
    account = await cdp.evm.get_or_create_account(name="swap-example-account")
    print(f"Using account: {account.address}")
    
    # Request some ETH from faucet if needed
    print("Requesting ETH from faucet...")
    tx_hash = await cdp.evm.request_faucet(
        address=account.address,
        network="base-sepolia",
        token="eth"
    )
    print(f"Faucet transaction: {tx_hash}")
    
    # Wait a bit for the faucet transaction to be confirmed
    print("Waiting for faucet transaction to confirm...")
    await asyncio.sleep(10)
    
    # Swap 0.001 ETH to USDC
    print("\nSwapping 0.001 ETH to USDC...")
    swap_result = await account.swap(
        SwapOptions(
            from_asset="eth",
            to_asset="usdc",
            amount="0.001",  # 0.001 ETH
            network="base-sepolia",
            slippage_percentage=0.5,  # 0.5% slippage tolerance
        )
    )
    
    print(f"Swap completed!")
    print(f"Transaction hash: {swap_result.transaction_hash}")
    print(f"Swapped {swap_result.from_amount} {swap_result.from_asset} for {swap_result.to_amount} {swap_result.to_asset}")
    
    # Example of swapping back USDC to ETH
    print("\nSwapping USDC back to ETH...")
    swap_back_result = await account.swap({
        "from_asset": "usdc",
        "to_asset": "eth",
        "amount": "1000000",  # 1 USDC in smallest unit (6 decimals)
        "network": "base-sepolia",
    })
    
    print(f"Swap back completed!")
    print(f"Transaction hash: {swap_back_result.transaction_hash}")


if __name__ == "__main__":
    asyncio.run(main()) 
