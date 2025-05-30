// Usage: pnpm tsx evm/createSwapQuote.ts

/**
 * This example demonstrates how to create a swap quote transaction with all necessary data
 * for execution. Unlike getSwapPrice which only provides pricing information, createSwapQuote
 * returns the complete transaction data needed to execute the swap onchain.
 * 
 * Key features:
 * 1. Returns transaction data ready for signing and submission
 * 2. Includes Permit2 data for ERC20 token swaps (if applicable)
 * 3. Provides gas estimates and pricing information
 * 4. Validates liquidity availability and detects potential issues
 * 5. Shows how to calculate exchange rates and price impact
 * 
 * Use this when you're ready to execute a swap. The returned transaction data
 * can be submitted using account.swap(), smartAccount.swap(), or directly
 * with viem/ethers by signing and broadcasting the transaction.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseUnits, 
  formatEther
} from "viem";
import "dotenv/config";

// Network configuration
const NETWORK = "base"; // Base mainnet

// Token definitions for the example (using Base mainnet token addresses)
const TOKENS = {
  WETH: {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    decimals: 18,
    isNativeAsset: false
  },
  USDC: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    decimals: 6,
    isNativeAsset: false
  },
};

// Create a CDP client
const cdp = new CdpClient();

async function main() {
  console.log(`Note: This example is using ${NETWORK} network.`);

  // Get or create an account to use for the swap
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
  console.log(`\nUsing account: ${ownerAccount.address}`);

  try {
    // Define the tokens we're working with
    const sellToken = TOKENS.WETH;
    const buyToken = TOKENS.USDC;
    
    // Set the amount we want to sell
    const sellAmount = parseUnits("0.1", sellToken.decimals); // 0.1 WETH
    
    console.log(`\nCreating a swap quote for ${formatEther(sellAmount)} ${sellToken.symbol} to ${buyToken.symbol}`);
    
    // Create the swap quote transaction
    console.log("\nFetching swap quote...");
    const swap = await cdp.evm.createSwapQuote({
      network: NETWORK,
      buyToken: buyToken.address as `0x${string}`,
      sellToken: sellToken.address as `0x${string}`,
      sellAmount,
      taker: ownerAccount.address,
      slippageBps: 100, // 1% slippage tolerance
    });
    
    // Log swap details
    logSwapInfo(swap, sellToken, buyToken);
    
    // Validate the swap for any issues
    validateSwap(swap);
    
    console.log("\nSwap quote created successfully. To execute this swap, you would need to:");
    console.log("1. Ensure you have sufficient token allowance for Permit2 contract");
    console.log("2. Submit the swap transaction (either using the CDP SDK or viem - more examples in account.sendSwapTransaction.ts, smartAccount.submitSwapOperation.ts, and sendSwapTransactionWithViem.ts)");
    console.log("3. Wait for transaction confirmation");
    
  } catch (error) {
    console.error("Error creating swap quote:", error);
  }
}

/**
 * Logs information about the swap
 * @param swap - The swap transaction data
 * @param sellToken - The token being sold
 * @param buyToken - The token being bought
 */
function logSwapInfo(
  swap: any,
  sellToken: typeof TOKENS.WETH,
  buyToken: typeof TOKENS.USDC
): void {
  if (!swap.liquidityAvailable) {
    return;
  }

  console.log("\nSwap Quote Details:");
  console.log("-------------------");
  console.log(`Buy Amount: ${formatUnits(BigInt(swap.buyAmount), buyToken.decimals)} ${buyToken.symbol}`);
  console.log(`Min Buy Amount: ${formatUnits(BigInt(swap.minBuyAmount), buyToken.decimals)} ${buyToken.symbol}`);
  console.log(`Sell Amount: ${formatUnits(BigInt(swap.sellAmount), sellToken.decimals)} ${sellToken.symbol}`);
  
  // Calculate and display price ratios
  const sellAmountBigInt = BigInt(swap.sellAmount);
  const buyAmountBigInt = BigInt(swap.buyAmount);
  const minBuyAmountBigInt = BigInt(swap.minBuyAmount);
  
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
  
  console.log("\nSuggested Gas Details:");
  console.log("----------------------------------");
  console.log(`Gas: ${swap.transaction.gas}`);
  console.log(`Gas Price: ${swap.transaction.gasPrice}`);
}

/**
 * Validates the swap for any issues
 * @param swap - The swap transaction data
 * @returns true if swap is valid, false if there are issues
 */
function validateSwap(swap: any): boolean {
  console.log("\nValidating Swap Quote:");
  console.log("---------------------");
  
  if (!swap.liquidityAvailable) {
    console.log("❌ Insufficient liquidity available for this swap.");
    return false;
  } else {
    console.log("✅ Liquidity available");
  }
  
  if (swap.issues.balance) {
    console.log("\n❌ Balance Issues:");
    console.log(`Current Balance: ${swap.issues.balance.currentBalance}`);
    console.log(`Required Balance: ${swap.issues.balance.requiredBalance}`);
    console.log(`Token: ${swap.issues.balance.token}`);
    console.log("\nInsufficient balance. Please add funds to your account.");
    return false;
  } else {
    console.log("✅ Sufficient balance");
  }

  if (swap.issues.simulationIncomplete) {
    console.log("⚠️ WARNING: Simulation incomplete. Transaction may fail.");
  } else {
    console.log("✅ Simulation complete");
  }
  
  return true;
}

main().catch(console.error);