"""Example showing how to get swap quotes."""

import asyncio
from cdp import Cdp


async def main():
    """Get swap quotes example."""
    # Configure CDP SDK
    cdp = Cdp.from_json("~/.config/coinbase_cloud/config.json")

    # Define token addresses
    eth_address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"  # ETH (EIP-7528)
    usdc_base = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # USDC on Base
    usdc_eth = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  # USDC on Ethereum
    weth_eth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"  # WETH on Ethereum

    # Example 1: ETH to USDC quote on Base
    print("Getting ETH to USDC quote on Base...")
    quote = await cdp.evm.get_quote(
        from_token=eth_address,
        to_token=usdc_base,
        amount="1000000000000000000",  # 1 ETH
        network="base",
    )
    
    print(f"Quote ID: {quote.quote_id}")
    print(f"From: {quote.from_amount} (ETH)")
    print(f"To: {quote.to_amount} (USDC)")
    print(f"Price ratio: {quote.price_ratio}")
    print(f"Expires at: {quote.expires_at}")
    
    # Example 2: USDC to ETH on Base
    print("\n" + "="*50)
    print("Getting USDC to ETH quote on Base...")
    
    quote2 = await cdp.evm.get_quote(
        from_token=usdc_base,
        to_token=eth_address,
        amount="2000000000",  # 2000 USDC
        network="base",
    )
    
    print(f"Quote ID: {quote2.quote_id}")
    print(f"From: {quote2.from_amount} (USDC)")
    print(f"To: {quote2.to_amount} (ETH)")
    
    # Example 3: ERC20 to ERC20 on Ethereum
    print("\n" + "="*50)
    print("Getting USDC to WETH quote on Ethereum...")
    
    quote3 = await cdp.evm.get_quote(
        from_token=usdc_eth,
        to_token=weth_eth,
        amount="1000000000",  # 1000 USDC
        network="ethereum",
    )
    
    print(f"Quote ID: {quote3.quote_id}")
    print(f"From: {quote3.from_amount} (USDC)")
    print(f"To: {quote3.to_amount} (WETH)")
    print(f"Price ratio: {quote3.price_ratio}")


if __name__ == "__main__":
    asyncio.run(main()) 
