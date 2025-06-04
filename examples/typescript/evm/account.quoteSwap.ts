// Usage: pnpm tsx evm/account.quoteSwap.ts

/**
 * This example demonstrates how to create a swap quote using the account.quoteSwap() method.
 * This is a convenience method that automatically includes the account's address as the taker.
 * 
 * Key differences from cdp.evm.createSwapQuote():
 * - account.quoteSwap(): Automatically uses the account address as taker
 * - account.quoteSwap(): More convenient API for account-based swaps
 * - cdp.evm.createSwapQuote(): Requires explicitly specifying the taker address
 * - cdp.evm.createSwapQuote(): More flexible for advanced use cases
 * 
 * IMPORTANT: Like createSwapQuote, this signals a soft commitment to swap and may reserve
 * funds on-chain. As such, it is rate-limited more strictly than getSwapPrice
 * to prevent abuse. Use getSwapPrice for more frequent price checks.
 * 
 * Use account.quoteSwap() when you need:
 * - Complete transaction data ready for execution
 * - Precise swap parameters with high accuracy
 * - To inspect transaction details before execution
 * - Simplified API for account-based swaps
 * 
 * The quote includes:
 * - Transaction data (to, data, value, gas)
 * - Permit2 signature requirements for ERC20 swaps
 * - Exact amounts with slippage protection
 * - Gas estimates and potential issues
 * 
 * Note: For the simplest swap experience, use account.swap() which handles
 * quote creation and execution in one call. Use account.quoteSwap() when you
 * need more control over the process.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseUnits, 
  formatEther,
  type Address
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
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to send
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nCreating a swap quote for ${formatEther(fromAmount)} ${fromToken.symbol} to ${toToken.symbol}`);
    
    // Create the swap quote using the account's quoteSwap method
    console.log("\nFetching swap quote using account.quoteSwap()...");
    const swapQuote = await ownerAccount.quoteSwap({
      network: NETWORK,
      toToken: toToken.address as Address,
      fromToken: fromToken.address as Address,
      fromAmount,
      slippageBps: 100, // 1% slippage tolerance
    });
    
    // Log swap details
    logSwapInfo(swapQuote, fromToken, toToken);
    
    // Validate the swap for any issues
    validateSwap(swapQuote);
    
    console.log("\nSwap quote created successfully. To execute this swap, you would need to:");
    console.log("1. Ensure you have sufficient token allowance for Permit2 contract");
    console.log("2. Submit the swap transaction using account.swap({ swapQuote })");
    console.log("3. Wait for transaction confirmation");
    
    // Show how to execute the swap using the account.swap() method
    console.log("\nTo execute this swap, you can use:");
    console.log("```typescript");
    console.log("// Execute the swap using the quote");
    console.log("const result = await ownerAccount.swap({");
    console.log("  swapQuote: swapQuote");
    console.log("});");
    console.log(`// Transaction hash: \${result.transactionHash}`);
    console.log("");
    console.log("// Or execute using the quote's execute() method");
    console.log("const result = await swapQuote.execute();");
    console.log("```");
    
  } catch (error) {
    console.error("Error creating swap quote:", error);
  }
}

/**
 * Logs information about the swap
 * @param swapQuote - The swap transaction data
 * @param fromToken - The token being sent
 * @param toToken - The token being received
 */
function logSwapInfo(
  swapQuote: any,
  fromToken: typeof TOKENS.WETH,
  toToken: typeof TOKENS.USDC
): void {
  if (!swapQuote.liquidityAvailable) {
    return;
  }

  console.log("\nSwap Quote Details:");
  console.log("-------------------");
  console.log(`Receive Amount: ${formatUnits(BigInt(swapQuote.toAmount), toToken.decimals)} ${toToken.symbol}`);
  console.log(`Min Receive Amount: ${formatUnits(BigInt(swapQuote.minToAmount), toToken.decimals)} ${toToken.symbol}`);
  console.log(`Send Amount: ${formatUnits(BigInt(swapQuote.fromAmount), fromToken.decimals)} ${fromToken.symbol}`);
  
  // Calculate and display price ratios
  const fromAmountBigInt = BigInt(swapQuote.fromAmount);
  const toAmountBigInt = BigInt(swapQuote.toAmount);
  const minToAmountBigInt = BigInt(swapQuote.minToAmount);
  
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
  
  console.log("\nSuggested Gas Details:");
  console.log("----------------------------------");
  console.log(`Gas: ${swapQuote.transaction.gas}`);
  console.log(`Gas Price: ${swapQuote.transaction.gasPrice}`);
}

/**
 * Validates the swap for any issues
 * @param swapQuote - The swap transaction data
 * @returns true if swap is valid, false if there are issues
 */
function validateSwap(swapQuote: any): boolean {
  console.log("\nValidating Swap Quote:");
  console.log("---------------------");
  
  if (!swapQuote.liquidityAvailable) {
    console.log("❌ Insufficient liquidity available for this swap.");
    return false;
  } else {
    console.log("✅ Liquidity available");
  }
  
  if (swapQuote.issues.balance) {
    console.log("\n❌ Balance Issues:");
    console.log(`Current Balance: ${swapQuote.issues.balance.currentBalance}`);
    console.log(`Required Balance: ${swapQuote.issues.balance.requiredBalance}`);
    console.log(`Token: ${swapQuote.issues.balance.token}`);
    console.log("\nInsufficient balance. Please add funds to your account.");
    return false;
  } else {
    console.log("✅ Sufficient balance");
  }

  if (swapQuote.issues.simulationIncomplete) {
    console.log("⚠️ WARNING: Simulation incomplete. Transaction may fail.");
  } else {
    console.log("✅ Simulation complete");
  }
  
  return true;
}

main().catch(console.error);