// Usage: pnpm tsx evm/getSwapQuote.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { formatUnits, parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient();

// Token definitions for the example
const TOKENS = {
  WETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    decimals: 18,
  },
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    decimals: 6,
  },
};

async function main() {
  // Get or create an account to use for the swap
  const account = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
  console.log(`Using account: ${account.address}`);

  try {
    // Define the tokens we're working with
    const sellToken = TOKENS.WETH;
    const buyToken = TOKENS.USDC;
    
    // Get a quote for swapping WETH to USDC on Ethereum mainnet
    const swapQuote = await cdp.evm.getSwapQuote({
      network: "ethereum",
      buyToken: buyToken.address,
      sellToken: sellToken.address,
      sellAmount: parseEther("0.1"), // 0.1 WETH in wei
      taker: account.address,
    });

    // Check for liquidity
    if (!swapQuote.liquidityAvailable) {
      console.log("Insufficient liquidity available for this swap.");
      return;
    }

    // At this point we know liquidityAvailable is true and we can access other properties
    console.log("Swap Quote:");
    console.log("-------------");
    console.log(`Buy Amount: ${formatUnits(swapQuote.buyAmount, buyToken.decimals)} ${buyToken.symbol}`);
    console.log(`Min Buy Amount: ${formatUnits(swapQuote.minBuyAmount, buyToken.decimals)} ${buyToken.symbol}`);
    console.log(`Sell Amount: ${formatUnits(swapQuote.sellAmount, sellToken.decimals)} ${sellToken.symbol}`);
    console.log(`Gas Estimate: ${swapQuote.gas}`);
    
    // Calculate and display price ratios
    const sellAmountBigInt = BigInt(swapQuote.sellAmount);
    const buyAmountBigInt = BigInt(swapQuote.buyAmount);
    
    // Calculate price: How many buyTokens per sellToken
    const sellTokenPrice = Number(
      (buyAmountBigInt * BigInt(10 ** (18 - buyToken.decimals))) / 
      (sellAmountBigInt * BigInt(10 ** (18 - sellToken.decimals)))
    ) / (10 ** 18);
    
    // Calculate inverse price: How many sellTokens per buyToken
    const buyTokenPrice = Number(
      (sellAmountBigInt * BigInt(10 ** (18 - sellToken.decimals))) / 
      (buyAmountBigInt * BigInt(10 ** (18 - buyToken.decimals)))
    ) / (10 ** 18);
    
    console.log("\nToken Price Calculations:");
    console.log("------------------------");
    console.log(`1 ${sellToken.symbol} = ${sellTokenPrice.toLocaleString()} ${buyToken.symbol}`);
    console.log(`1 ${buyToken.symbol} = ${buyTokenPrice.toLocaleString()} ${sellToken.symbol}`);
    
    // Check for any issues
    if (swapQuote.issues.allowance) {
      console.log("\nAllowance Issues:");
      console.log(`Current Allowance: ${swapQuote.issues.allowance.currentAllowance}`);
      console.log(`Spender: ${swapQuote.issues.allowance.spender}`);
    }
    
    if (swapQuote.issues.balance) {
      console.log("\nBalance Issues:");
      console.log(`Current Balance: ${swapQuote.issues.balance.currentBalance}`);
      console.log(`Required Balance: ${swapQuote.issues.balance.requiredBalance}`);
    }

    if (swapQuote.issues.simulationIncomplete) {
      console.log("\n⚠️ WARNING: Simulation incomplete. Results may not be accurate.");
    }
  } catch (error) {
    console.error("Error getting swap quote:", error);
  }
}

main().catch(console.error); 