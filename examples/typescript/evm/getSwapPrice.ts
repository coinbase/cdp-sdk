// Usage: pnpm tsx evm/getSwapPrice.ts

/**
 * This example demonstrates how to get swap pricing information without executing a swap.
 * 
 * Use getSwapPrice when you need:
 * - Quick price estimates for display purposes
 * - Exchange rate calculations for UI components  
 * - Liquidity checks before attempting a swap
 * - Price comparisons across different token pairs
 * 
 * Key differences from createSwapQuote:
 * - getSwapPrice: Returns pricing data only, no transaction details
 * - getSwapPrice: Can be queried more frequently, but data may be less precise
 * - createSwapQuote: Returns full transaction data ready for execution
 * - createSwapQuote: May reserve funds on-chain (represents a soft commitment to swap)
 * - createSwapQuote: More strictly rate-limited to prevent abuse
 * 
 * getSwapPrice is ideal for:
 * - Price calculators and converters
 * - Displaying "you will receive approximately X tokens"
 * - Real-time price updates in your UI
 * - Checking if a swap route exists before showing swap UI
 * 
 * Note: getSwapPrice provides estimates only. Actual swap execution may have
 * slight variations due to market movements between pricing and execution.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { formatUnits, parseEther, type Address } from "viem";
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
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Get a price for swapping WETH to USDC on Ethereum mainnet
    const swapPrice = await cdp.evm.getSwapPrice({
      network: "ethereum",
      toToken: toToken.address as Address,
      fromToken: fromToken.address as Address,
      fromAmount: parseEther("0.1"), // 0.1 WETH in wei
      taker: ownerAccount.address,
    });

    // Check for liquidity
    if (!swapPrice.liquidityAvailable) {
      console.log("Insufficient liquidity available for this swap.");
      return;
    }

    // At this point we know liquidityAvailable is true and we can access all properties
    console.log("\nSwap Price:");
    console.log("-------------");
    console.log(`To Token Amount: ${formatUnits(swapPrice.toAmount, toToken.decimals)} ${toToken.symbol}`);
    console.log(`Min To Token Amount: ${formatUnits(swapPrice.minToAmount, toToken.decimals)} ${toToken.symbol}`);
    console.log(`From Token Amount: ${formatUnits(swapPrice.fromAmount, fromToken.decimals)} ${fromToken.symbol}`);
    console.log(`Gas Estimate: ${swapPrice.gas}`);
    
    // Calculate and display price ratios
    const fromAmountBigInt = BigInt(swapPrice.fromAmount);
    const toAmountBigInt = BigInt(swapPrice.toAmount);
    const minToAmountBigInt = BigInt(swapPrice.minToAmount);
    
    // Calculate exchange rate: How many toTokens per 1 fromToken
    const fromToToRate = Number(toAmountBigInt) / (10 ** toToken.decimals) * 
                         (10 ** fromToken.decimals) / Number(fromAmountBigInt);

    // Calculate minimum exchange rate with slippage applied
    const minFromToToRate = Number(minToAmountBigInt) / (10 ** toToken.decimals) * 
                           (10 ** fromToken.decimals) / Number(fromAmountBigInt);

    // Calculate maximum toToken to fromToken ratio with slippage
    const maxToToFromRate = Number(fromAmountBigInt) / (10 ** fromToken.decimals) *
                           (10 ** toToken.decimals) / Number(minToAmountBigInt);

    // Calculate exchange rate: How many fromTokens per 1 toToken
    const toToFromRate = Number(fromAmountBigInt) / (10 ** fromToken.decimals) *
                         (10 ** toToken.decimals) / Number(toAmountBigInt);
    
    console.log("\nToken Price Calculations:");
    console.log("------------------------");
    console.log(`1 ${fromToken.symbol} = ${fromToToRate.toFixed(toToken.decimals)} ${toToken.symbol}`);
    console.log(`1 ${toToken.symbol} = ${toToFromRate.toFixed(fromToken.decimals)} ${fromToken.symbol}`);

    // Calculate effective exchange rate with slippage applied
    console.log("\nWith Slippage Applied (Worst Case):");
    console.log("----------------------------------");
    console.log(`1 ${fromToken.symbol} = ${minFromToToRate.toFixed(toToken.decimals)} ${toToken.symbol} (minimum)`);
    console.log(`1 ${toToken.symbol} = ${maxToToFromRate.toFixed(fromToken.decimals)} ${fromToken.symbol} (maximum)`);
    console.log(`Maximum price impact: ${((fromToToRate - minFromToToRate) / fromToToRate * 100).toFixed(2)}%`);

    // Check for any issues
    if (swapPrice.issues.allowance) {
      console.log("\nAllowance Issues:");
      console.log(`Current Allowance: ${swapPrice.issues.allowance.currentAllowance}`);
      console.log(`Spender: ${swapPrice.issues.allowance.spender}`);
    }
    
    if (swapPrice.issues.balance) {
      console.log("\nBalance Issues:");
      console.log(`Current Balance: ${swapPrice.issues.balance.currentBalance}`);
      console.log(`Required Balance: ${swapPrice.issues.balance.requiredBalance}`);
    }

    if (swapPrice.issues.simulationIncomplete) {
      console.log("\n⚠️ WARNING: Simulation incomplete. Results may not be accurate.");
    }
  } catch (error) {
    console.error("Error getting swap price:", error);
  }
}

main().catch(console.error); 