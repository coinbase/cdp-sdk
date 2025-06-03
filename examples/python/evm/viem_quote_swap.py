#!/usr/bin/env python3
# Usage: uv run python evm/viem_quote_swap.py

"""
Example: Get Swap Quote for Viem/Web3

This example demonstrates how to get a swap quote that can be used
with viem or any other web3 library. Unlike the full viem_swap.py
example, this focuses on just getting the quote data without the
execution details.
"""

import asyncio
import json
from decimal import Decimal

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Get a swap quote for use with viem/web3."""
    async with CdpClient() as cdp:
        # Token addresses on Base
        USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        WETH = "0x4200000000000000000000000000000000000006"
        
        # Your wallet address (this would be the address executing the swap)
        wallet_address = "0x1234567890123456789012345678901234567890"  # Replace with your address
        
        print("Getting swap quote for viem/web3...")
        print(f"Wallet address: {wallet_address}")
        print(f"Swap: 50 USDC → WETH on Base\n")
        
        try:
            # Create a swap quote
            quote = await cdp.evm.create_swap_quote(
                from_token=USDC,
                to_token=WETH,
                from_amount="50000000",  # 50 USDC (6 decimals)
                network="base",
                taker=wallet_address,
                slippage_bps=150,  # 1.5% slippage
                # Note: Don't pass from_account since we'll execute externally
            )
            
            # Display quote details
            print("📊 Swap Quote Details:")
            print(f"   Quote ID: {quote.quote_id}")
            print(f"   Selling: {Decimal(quote.from_amount) / Decimal(10**6):.2f} USDC")
            print(f"   Expected output: {Decimal(quote.to_amount) / Decimal(10**18):.6f} WETH")
            print(f"   Minimum output: {Decimal(quote.min_to_amount) / Decimal(10**18):.6f} WETH")
            print(f"   Max slippage: 1.5%")
            
            # Calculate the exchange rate
            from_amount_decimal = Decimal(quote.from_amount) / Decimal(10**6)
            to_amount_decimal = Decimal(quote.to_amount) / Decimal(10**18)
            rate = to_amount_decimal / from_amount_decimal
            print(f"   Exchange rate: 1 USDC = {rate:.8f} WETH")
            
            # Export quote data for viem
            print("\n📋 Quote Data for Viem/Web3:")
            viem_data = {
                "quote_id": quote.quote_id,
                "from_token": quote.from_token,
                "to_token": quote.to_token,
                "from_amount": quote.from_amount,
                "to_amount": quote.to_amount,
                "min_to_amount": quote.min_to_amount,
                "transaction": {
                    "to": quote.to,
                    "data": quote.data,
                    "value": quote.value,
                    "from": wallet_address,
                }
            }
            
            # Add gas parameters if available
            if quote.gas_limit:
                viem_data["transaction"]["gas"] = str(quote.gas_limit)
            if quote.max_fee_per_gas:
                viem_data["transaction"]["maxFeePerGas"] = quote.max_fee_per_gas
            if quote.max_priority_fee_per_gas:
                viem_data["transaction"]["maxPriorityFeePerGas"] = quote.max_priority_fee_per_gas
            
            print(json.dumps(viem_data, indent=2))
            
            # Handle Permit2 if required
            if quote.requires_signature and quote.permit2_data:
                print("\n⚠️  Note: This swap requires a Permit2 signature!")
                print("   Include the Permit2 data when signing in your web3 application.")
                viem_data["permit2_required"] = True
                viem_data["permit2_hash"] = quote.permit2_data.hash
            
            print("\n✅ Quote data ready for use with viem/web3")
            
        except Exception as e:
            print(f"\n❌ Error getting quote: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 