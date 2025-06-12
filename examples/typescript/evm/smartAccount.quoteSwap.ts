// Usage: pnpm tsx evm/smartAccount.quoteSwap.ts

/**
 * This example demonstrates how to create a swap quote using the smartAccount.quoteSwap() method.
 * This is a convenience method that automatically includes the smart account's address as the taker.
 * 
 * Key differences from cdp.evm.createSwapQuote():
 * - smartAccount.quoteSwap(): Automatically uses the smart account address as taker
 * - smartAccount.quoteSwap(): More convenient API for smart account-based swaps
 * - cdp.evm.createSwapQuote(): Requires explicitly specifying the taker address
 * - cdp.evm.createSwapQuote(): More flexible for advanced use cases
 * 
 * Smart account specific features:
 * - Uses user operations instead of direct transactions
 * - Owner signs permit2 messages (not the smart account itself)
 * - Supports paymaster for gas sponsorship
 * - Returns user operation hashes instead of transaction hashes
 * 
 * IMPORTANT: Like createSwapQuote, this signals a soft commitment to swap and may reserve
 * funds on-chain. As such, it is rate-limited more strictly than getSwapPrice
 * to prevent abuse. Use getSwapPrice for more frequent price checks.
 * 
 * Use smartAccount.quoteSwap() when you need:
 * - Complete user operation data ready for execution
 * - Precise swap parameters with high accuracy
 * - To inspect transaction details before execution
 * - Simplified API for smart account-based swaps
 * 
 * The quote includes:
 * - Transaction data (to, data, value, gas)
 * - Permit2 signature requirements for ERC20 swaps
 * - Exact amounts with slippage protection
 * - Gas estimates and potential issues
 * 
 * Note: For the simplest swap experience, use smartAccount.swap() which handles
 * quote creation and execution in one call. Use smartAccount.quoteSwap() when you
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
  console.log(`Note: This example is using ${NETWORK} network with smart accounts.`);

  // Create an owner account for the smart account
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SmartAccountOwner" });
  console.log(`Owner account: ${ownerAccount.address}`);

  // Create a smart account
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: "SmartAccount",
    owner: ownerAccount
  });
  console.log(`\nUsing smart account: ${smartAccount.address}`);

  try {
    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to send
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nCreating a swap quote for ${formatEther(fromAmount)} ${fromToken.symbol} to ${toToken.symbol}`);
    
    // Create the swap quote using the smart account's quoteSwap method
    console.log("\nFetching swap quote using smartAccount.quoteSwap()...");
    const swapQuote = await smartAccount.quoteSwap({
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
    console.log("2. Submit the swap via user operation using smartAccount.swap({ swapQuote })");
    console.log("3. Wait for user operation confirmation");
    
    // Show how to execute the swap using the smartAccount.swap() method
    console.log(
      `
\`\`\`typescript
// Execute the swap using the quote
const result = await smartAccount.swap({
  swapQuote,
  // Optional: paymasterUrl: 'https://paymaster.example.com'
});

// User operation hash: \${result.userOpHash}

// Or execute using the quote's execute() method
const result = await swapQuote.execute();

// Wait for user operation completion
const receipt = await smartAccount.waitForUserOperation({
  userOpHash: result.userOpHash
});
\`\`\`
`
    );
    
  } catch (error) {
    console.error("Error creating smart account swap quote:", error);
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

  console.log("\nSmart Account Swap Quote Details:");
  console.log("---------------------------------");
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
  
  console.log("\nSuggested Gas Details (for user operation):");
  console.log("-------------------------------------------");
  console.log(`Gas: ${swapQuote.transaction.gas}`);
  console.log(`Gas Price: ${swapQuote.transaction.gasPrice}`);
  
  // Smart account specific information
  console.log("\nSmart Account Specific Notes:");
  console.log("----------------------------");
  console.log("• This swap will be executed via a user operation");
  console.log("• The owner account will sign any required Permit2 signatures");
  console.log("• Gas fees can optionally be sponsored via a paymaster");
  console.log("• Execution returns a user operation hash, not a transaction hash");
}

/**
 * Validates the swap for any issues
 * @param swapQuote - The swap transaction data
 * @returns true if swap is valid, false if there are issues
 */
function validateSwap(swapQuote: any): boolean {
  console.log("\nValidating Smart Account Swap Quote:");
  console.log("-----------------------------------");
  
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
    console.log("\nInsufficient balance. Please add funds to your smart account.");
    return false;
  } else {
    console.log("✅ Sufficient balance");
  }

  if (swapQuote.issues.allowance) {
    console.log("\n⚠️ Allowance Issues:");
    console.log(`Current Allowance: ${swapQuote.issues.allowance.currentAllowance}`);
    console.log(`Required Allowance: ${swapQuote.issues.allowance.requiredAllowance || 'Unknown'}`);
    console.log(`Spender: ${swapQuote.issues.allowance.spender}`);
    console.log("\nNote: You may need to approve tokens before swapping.");
    console.log("This can be done via a user operation to the token contract.");
  } else {
    console.log("✅ Sufficient allowance");
  }

  if (swapQuote.issues.simulationIncomplete) {
    console.log("⚠️ WARNING: Simulation incomplete. User operation may fail.");
  } else {
    console.log("✅ Simulation complete");
  }
  
  return true;
}

main().catch(console.error); 