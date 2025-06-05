// Usage: pnpm tsx evm/smartAccount.swap.ts

/**
 * This example demonstrates how to perform token swaps using EVM smart accounts.
 * 
 * Smart account swaps work similarly to regular account swaps but use user operations
 * instead of direct transactions. Key differences:
 * 
 * - Smart account address is used as the taker (it owns the tokens)
 * - Owner signs permit2 messages (not the smart account itself)
 * - Uses sendSwapOperation → sendUserOperation instead of sendSwapTransaction
 * - Returns user operation hash instead of transaction hash
 * - Supports paymaster for gas sponsorship
 * 
 * This example shows two approaches:
 * 
 * Approach 1: All-in-one pattern (RECOMMENDED)
 * - Uses smartAccount.swap() with inline options
 * - Creates and executes swaps in a single call
 * - Automatically validates liquidity and throws clear errors
 * - Minimal code, maximum convenience
 * 
 * Approach 2: Create-then-execute pattern (advanced)
 * - First creates a swap quote using smartAccount.quoteSwap()
 * - Allows inspection of swap details before execution
 * - Provides more control for complex scenarios
 * - Use when you need conditional logic based on swap details
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  parseUnits, 
  createPublicClient, 
  http, 
  erc20Abi,
  encodeFunctionData,
  formatEther,
  formatUnits,
  type Address,
} from "viem";
import { base } from "viem/chains";
import "dotenv/config";

// Network configuration
const NETWORK = "base"; // Base mainnet

// Create a viem public client for transaction monitoring
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

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

// Permit2 contract address is the same across all networks
const PERMIT2_ADDRESS: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// Create a CDP client
const cdp = new CdpClient();

async function main() {
  console.log(`Note: This example is using ${NETWORK} network with smart accounts. Make sure you have funds available.`);

  // Create an owner account for the smart account
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SmartAccountOwner" });
  console.log(`Owner account: ${ownerAccount.address}`);

  // Create a smart account
  const smartAccount = await cdp.evm.createSmartAccount({ 
    owner: ownerAccount
  });
  console.log(`Smart account: ${smartAccount.address}`);

  try {
    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to send
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nInitiating smart account swap of ${formatEther(fromAmount)} ${fromToken.symbol} for ${toToken.symbol}`);

    // Handle token allowance check and approval if needed (applicable when sending non-native assets only)
    if (!fromToken.isNativeAsset) {
      await handleTokenAllowance(
        smartAccount.address as Address, 
        fromToken.address as Address,
        fromToken.symbol,
        fromAmount
      );
    }
    
    // Approach 1: All-in-one pattern (RECOMMENDED)
    console.log("\n=== APPROACH 1: All-in-one pattern ===");
    
    try {
      // Create and execute the swap in one call - simpler but less control
      const result = await smartAccount.swap({
        network: NETWORK,
        toToken: toToken.address as Address,
        fromToken: fromToken.address as Address,
        fromAmount,
        slippageBps: 100, // 1% slippage tolerance
        // Optional: paymasterUrl: "https://paymaster.example.com"
      });

      console.log(`\n✅ Smart account swap submitted successfully!`);
      console.log(`User operation hash: ${result.userOpHash}`);
      console.log(`Smart account address: ${result.smartAccountAddress}`);
      console.log(`Status: ${result.status}`);

      // Wait for user operation completion
      const receipt = await smartAccount.waitForUserOperation({
        userOpHash: result.userOpHash,
      });

      console.log("\n🎉 Smart Account Swap User Operation Completed!");
      console.log(`Final status: ${receipt.status}`);
      
      if (receipt.status === "complete") {
        console.log(`Transaction Explorer: https://basescan.org/tx/${receipt.userOpHash}`);
      }

    } catch (error: any) {
      // The all-in-one pattern will throw an error if liquidity is not available
      if (error.message?.includes("Insufficient liquidity")) {
        console.log("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.");
        console.log("Try reducing the swap amount or using a different token pair.");
      } else {
        throw error;
      }
    }

    console.log("\n" + "=".repeat(60));
    
    // Approach 2: Create-then-execute pattern (advanced)
    console.log("\n=== APPROACH 2: Create-then-execute pattern ===");
    
    // Step 1: Create the swap quote
    console.log("\n🔍 Step 1: Creating swap quote...");
    const swapQuote = await smartAccount.quoteSwap({
      network: NETWORK,
      toToken: toToken.address as Address,
      fromToken: fromToken.address as Address,
      fromAmount,
      slippageBps: 100, // 1% slippage tolerance
    });

    // Check if liquidity is available
    if (!swapQuote.liquidityAvailable) {
      console.log("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.");
      console.log("Try reducing the swap amount or using a different token pair.");
      return;
    }

    // Step 2: Inspect and validate the swap details
    console.log("\n📊 Step 2: Analyzing swap quote...");
    displaySwapQuoteDetails(swapQuote, fromToken, toToken);
    
    // Validate the swap for any issues
    if (!validateSwapQuote(swapQuote)) {
      console.log("\n❌ Swap validation failed. Aborting execution.");
      return;
    }

    // Step 3: Execute the swap
    console.log("\n🚀 Step 3: Executing swap via user operation...");
    
    const result2 = await smartAccount.swap({
      swapQuote: swapQuote,
      // Optional: paymasterUrl: "https://paymaster.example.com"
    });

    console.log(`\n✅ Smart account swap submitted successfully!`);
    console.log(`User operation hash: ${result2.userOpHash}`);
    console.log(`Smart account address: ${result2.smartAccountAddress}`);
    console.log(`Status: ${result2.status}`);

    // Wait for user operation completion
    const receipt2 = await smartAccount.waitForUserOperation({
      userOpHash: result2.userOpHash,
    });

    console.log("\n🎉 Smart Account Swap User Operation Completed!");
    console.log(`Final status: ${receipt2.status}`);
    
    if (receipt2.status === "complete") {
      console.log(`Transaction Explorer: https://basescan.org/tx/${receipt2.userOpHash}`);
    }
    
  } catch (error) {
    console.error("Error executing smart account swap:", error);
  }
}

/**
 * Displays detailed information about the swap quote
 * @param swapQuote - The swap quote data
 * @param fromToken - The token being sent
 * @param toToken - The token being received
 */
function displaySwapQuoteDetails(
  swapQuote: any,
  fromToken: typeof TOKENS.WETH,
  toToken: typeof TOKENS.USDC
): void {
  console.log("Smart Account Swap Quote Details:");
  console.log("=================================");
  
  const fromAmountFormatted = formatUnits(BigInt(swapQuote.fromAmount), fromToken.decimals);
  const toAmountFormatted = formatUnits(BigInt(swapQuote.toAmount), toToken.decimals);
  const minToAmountFormatted = formatUnits(BigInt(swapQuote.minToAmount), toToken.decimals);
  
  console.log(`📤 Sending: ${fromAmountFormatted} ${fromToken.symbol}`);
  console.log(`📥 Receiving: ${toAmountFormatted} ${toToken.symbol}`);
  console.log(`🔒 Minimum Receive: ${minToAmountFormatted} ${toToken.symbol}`);
  
  // Calculate exchange rate
  const exchangeRate = Number(swapQuote.toAmount) / Number(swapQuote.fromAmount) * 
                      Math.pow(10, fromToken.decimals - toToken.decimals);
  console.log(`💱 Exchange Rate: 1 ${fromToken.symbol} = ${exchangeRate.toFixed(2)} ${toToken.symbol}`);
  
  // Calculate slippage
  const slippagePercent = ((Number(swapQuote.toAmount) - Number(swapQuote.minToAmount)) / 
                          Number(swapQuote.toAmount) * 100);
  console.log(`📉 Max Slippage: ${slippagePercent.toFixed(2)}%`);
  
  // Gas information
  if (swapQuote.transaction?.gas) {
    console.log(`⛽ Estimated Gas: ${swapQuote.transaction.gas.toLocaleString()}`);
  }
}

/**
 * Validates the swap quote for any issues
 * @param swapQuote - The swap quote data
 * @returns true if swap is valid, false if there are issues
 */
function validateSwapQuote(swapQuote: any): boolean {
  console.log("\nValidation Results:");
  console.log("==================");
  
  let isValid = true;
  
  // Check liquidity
  if (!swapQuote.liquidityAvailable) {
    console.log("❌ Insufficient liquidity available");
    isValid = false;
  } else {
    console.log("✅ Liquidity available");
  }
  
  // Check balance issues
  if (swapQuote.issues?.balance) {
    console.log("❌ Balance Issues:");
    console.log(`   Current: ${swapQuote.issues.balance.currentBalance}`);
    console.log(`   Required: ${swapQuote.issues.balance.requiredBalance}`);
    console.log(`   Token: ${swapQuote.issues.balance.token}`);
    isValid = false;
  } else {
    console.log("✅ Sufficient balance");
  }
  
  // Check allowance issues
  if (swapQuote.issues?.allowance) {
    console.log("❌ Allowance Issues:");
    console.log(`   Current: ${swapQuote.issues.allowance.currentAllowance}`);
    console.log(`   Required: ${swapQuote.issues.allowance.requiredAllowance}`);
    console.log(`   Spender: ${swapQuote.issues.allowance.spender}`);
    isValid = false;
  } else {
    console.log("✅ Sufficient allowance");
  }
  
  // Check simulation
  if (swapQuote.issues?.simulationIncomplete) {
    console.log("⚠️ WARNING: Simulation incomplete - transaction may fail");
    // Not marking as invalid since this is just a warning
  } else {
    console.log("✅ Simulation complete");
  }
  
  return isValid;
}

/**
 * Handles token allowance check and approval if needed for smart accounts
 * @param smartAccountAddress - The address of the smart account
 * @param tokenAddress - The address of the token to be sent
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param fromAmount - The amount to be sent
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  smartAccountAddress: Address, 
  tokenAddress: Address,
  tokenSymbol: string,
  fromAmount: bigint
): Promise<void> {
  console.log("\n🔐 Checking token allowance for smart account...");
  
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    smartAccountAddress, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < fromAmount) {
    console.log(`❌ Allowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(fromAmount)}`);
    console.log(`⚠️  Note: For smart accounts, you'll need to submit a user operation to approve tokens.`);
    console.log(`   This example assumes tokens are already approved or uses native assets.`);
  } else {
    console.log(`✅ Token allowance sufficient. Current: ${formatEther(currentAllowance)} ${tokenSymbol}`);
  }
}

/**
 * Check token allowance for the Permit2 contract
 * @param owner - The token owner's address (smart account)
 * @param token - The token contract address
 * @param symbol - The token symbol for logging
 * @returns The current allowance
 */
async function getAllowance(
  owner: Address, 
  token: Address,
  symbol: string
): Promise<bigint> {
  console.log(`\nChecking allowance for ${symbol} (${token}) to Permit2 contract...`);
  
  try {
    const allowance = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, PERMIT2_ADDRESS]
    });
    
    console.log(`Current allowance: ${formatEther(allowance)} ${symbol}`);
    return allowance;
  } catch (error) {
    console.error("Error checking allowance:", error);
    return BigInt(0);
  }
}

main().catch(console.error); 