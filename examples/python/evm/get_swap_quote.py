"""Example of getting swap quotes without executing the swap."""

import asyncio
from cdp import CdpClient


async def main():
    # Initialize CDP client
    cdp = CdpClient.from_json("~/.cdp/credentials.json")
    
    # Get a quote for swapping ETH to USDC
    print("Getting quote for swapping 0.01 ETH to USDC...")
    quote = await cdp.evm.get_quote(
        from_asset="eth",
        to_asset="usdc",
        amount="0.01",  # 0.01 ETH
        network="base-sepolia"
    )
    
    print(f"\nQuote Details:")
    print(f"From: {quote.from_amount} {quote.from_asset}")
    print(f"To: {quote.to_amount} {quote.to_asset}")
    print(f"Price Impact: {quote.price_impact}%")
    print(f"Route: {' -> '.join(quote.route)}")
    print(f"Estimated Gas: {quote.gas_estimate} wei")
    
    # Get a quote for swapping USDC to ETH using contract addresses
    print("\n\nGetting quote for swapping 100 USDC to ETH...")
    usdc_address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"  # USDC on Base Sepolia
    quote2 = await cdp.evm.get_quote(
        from_asset=usdc_address,
        to_asset="eth",
        amount=100000000,  # 100 USDC in smallest unit (6 decimals)
        network="base-sepolia"
    )
    
    print(f"\nQuote Details:")
    print(f"From: {quote2.from_amount} {quote2.from_asset}")
    print(f"To: {quote2.to_amount} {quote2.to_asset}")
    print(f"Price Impact: {quote2.price_impact}%")
    
    # Get a quote for swapping between two ERC20 tokens
    print("\n\nGetting quote for swapping USDC to WETH...")
    quote3 = await cdp.evm.get_quote(
        from_asset="usdc",
        to_asset="weth",
        amount="50",  # 50 USDC
        network="base-sepolia"
    )
    
    print(f"\nQuote Details:")
    print(f"From: {quote3.from_amount} {quote3.from_asset}")
    print(f"To: {quote3.to_amount} {quote3.to_asset}")
    print(f"Price Impact: {quote3.price_impact}%")
    print(f"Route: {' -> '.join(quote3.route)}")


if __name__ == "__main__":
    asyncio.run(main()) 
