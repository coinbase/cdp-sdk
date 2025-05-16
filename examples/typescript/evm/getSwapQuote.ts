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
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
  console.log(`Using account: ${ownerAccount.address}`);

  try {
    // Define the tokens we're working with
    const sellToken = TOKENS.WETH;
    const buyToken = TOKENS.USDC;
    
    // Get a quote for swapping WETH to USDC on Ethereum mainnet
    const swapQuote = await cdp.evm.getSwapQuote({
      network: "ethereum",
      buyToken: buyToken.address as `0x${string}`,
      sellToken: sellToken.address as `0x${string}`,
      sellAmount: parseEther("0.1"), // 0.1 WETH in wei
      taker: ownerAccount.address,
    }) as any;

    // Check for liquidity
    if (!swapQuote.liquidityAvailable) {
      console.log("Insufficient liquidity available for this swap.");
      return;
    }

    // At this point we know liquidityAvailable is true and we can access all properties
    console.log("\nSwap Quote:");
    console.log("-------------");
    console.log(`Buy Amount: ${formatUnits(swapQuote.buyAmount, buyToken.decimals)} ${buyToken.symbol}`);
    console.log(`Min Buy Amount: ${formatUnits(swapQuote.minBuyAmount, buyToken.decimals)} ${buyToken.symbol}`);
    console.log(`Sell Amount: ${formatUnits(swapQuote.sellAmount, sellToken.decimals)} ${sellToken.symbol}`);
    console.log(`Gas Estimate: ${swapQuote.gas}`);
    
    // Calculate and display price ratios
    const sellAmountBigInt = BigInt(swapQuote.sellAmount);
    const buyAmountBigInt = BigInt(swapQuote.buyAmount);
    const minBuyAmountBigInt = BigInt(swapQuote.minBuyAmount);
    
    // Calculate exchange rate: How many buy tokens per 1 sell token
    const sellToBuyRate = Number(buyAmountBigInt) / (10 ** buyToken.decimals) * 
                         (10 ** sellToken.decimals) / Number(sellAmountBigInt);

    // Calculate minimum exchange rate with slippage applied
    const minSellToBuyRate = Number(minBuyAmountBigInt) / (10 ** buyToken.decimals) * 
                           (10 ** sellToken.decimals) / Number(sellAmountBigInt);

    // Calculate maximum buyToken to sellToken ratio with slippage
    const maxBuyToSellRate = Number(sellAmountBigInt) / (10 ** sellToken.decimals) *
                           (10 ** buyToken.decimals) / Number(minBuyAmountBigInt);

    // Calculate exchange rate: How many sell tokens per 1 buy token
    const buyToSellRate = Number(sellAmountBigInt) / (10 ** sellToken.decimals) *
                         (10 ** buyToken.decimals) / Number(buyAmountBigInt);
    
    console.log("\nToken Price Calculations:");
    console.log("------------------------");
    console.log(`1 ${sellToken.symbol} = ${sellToBuyRate.toFixed(buyToken.decimals)} ${buyToken.symbol}`);
    console.log(`1 ${buyToken.symbol} = ${buyToSellRate.toFixed(sellToken.decimals)} ${sellToken.symbol}`);

    // Calculate effective exchange rate with slippage applied
    console.log("\nWith Slippage Applied (Worst Case):");
    console.log("----------------------------------");
    console.log(`1 ${sellToken.symbol} = ${minSellToBuyRate.toFixed(buyToken.decimals)} ${buyToken.symbol} (minimum)`);
    console.log(`1 ${buyToken.symbol} = ${maxBuyToSellRate.toFixed(sellToken.decimals)} ${sellToken.symbol} (maximum)`);
    console.log(`Maximum price impact: ${((sellToBuyRate - minSellToBuyRate) / sellToBuyRate * 100).toFixed(2)}%`);

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