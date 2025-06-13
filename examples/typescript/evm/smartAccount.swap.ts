// Usage: pnpm tsx evm/smartAccount.swap.ts

/**
 * This example demonstrates the recommended approach for performing token swaps
 * using smart accounts with the CDP SDK's all-in-one swap pattern.
 * 
 * Why use smartAccount.swap() (all-in-one pattern)?
 * - Simplest developer experience - one function call
 * - Automatically handles quote creation and execution
 * - Manages Permit2 signatures transparently
 * - Built-in error handling for common issues
 * - Best for 90% of smart account swap use cases
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
 * 
 * Common features:
 * - Both handle Permit2 signatures automatically for ERC20 swaps
 * - Both check for and report liquidity issues
 * - Both require proper token allowances (see handleTokenAllowance)
 * - Both execute via user operations with optional paymaster support
 * 
 * Choose based on your needs:
 * - Use Approach 1 for simple, direct swaps (recommended)
 * - Use Approach 2 when you need to inspect details or add custom logic
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
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: "SmartAccount",
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
        smartAccount,
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

      /* Alternative - Approach 2: Create swap quote first, inspect it, then send it separately
      // This gives you more control to analyze the swap details before execution
      
      // Step 1: Create the swap quote
      const swapQuote = await smartAccount.quoteSwap({
        network: NETWORK,
        toToken: toToken.address as Address,
        fromToken: fromToken.address as Address,
        fromAmount,
        slippageBps: 100, // 1% slippage tolerance
      });
      
      // Step 2: Check if liquidity is available
      if (!swapQuote.liquidityAvailable) {
        console.log("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.");
        return;
      }
      
      // Step 3: Optionally inspect swap details
      console.log(`Receive Amount: ${formatUnits(swapQuote.toAmount, toToken.decimals)} ${toToken.symbol}`);
      console.log(`Min Receive Amount: ${formatUnits(swapQuote.minToAmount, toToken.decimals)} ${toToken.symbol}`);
      if (swapQuote.fees?.gasFee) {
        console.log(`Gas Fee: ${formatEther(swapQuote.fees.gasFee.amount)} ${swapQuote.fees.gasFee.token}`);
      }
      
      // Step 4: Execute the swap via user operation
      // Option A: Using smartAccount.swap() with the pre-created swap quote
      const result = await smartAccount.swap({
        swapQuote: swapQuote,
        // Optional: paymasterUrl: "https://paymaster.example.com"
      });
      
      // Option B: Using the swap quote's execute() method directly
      const result = await swapQuote.execute();
      */

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

  } catch (error) {
    console.error("Error executing smart account swap:", error);
  }
}

/**
 * Handles token allowance check and approval if needed for smart accounts
 * @param smartAccount - The smart account instance
 * @param tokenAddress - The address of the token to be sent
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param fromAmount - The amount to be sent
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  smartAccount: any,
  tokenAddress: Address,
  tokenSymbol: string,
  fromAmount: bigint
): Promise<void> {
  console.log("\n🔐 Checking token allowance for smart account...");
  
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    smartAccount.address as Address, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < fromAmount) {
    console.log(`❌ Allowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(fromAmount)}`);
    
    // Set the allowance to the required amount via user operation
    await approveTokenAllowance(
      smartAccount,
      tokenAddress,
      PERMIT2_ADDRESS,
      fromAmount
    );
    console.log(`✅ Set allowance to ${formatEther(fromAmount)} ${tokenSymbol}`);
  } else {
    console.log(`✅ Token allowance sufficient. Current: ${formatEther(currentAllowance)} ${tokenSymbol}`);
  }
}

/**
 * Handle approval for token allowance if needed for smart accounts
 * This is necessary when swapping ERC20 tokens (not native ETH)
 * The Permit2 contract needs approval to move tokens on behalf of the smart account
 * @param smartAccount - The smart account instance
 * @param tokenAddress - The token contract address
 * @param spenderAddress - The address allowed to spend the tokens
 * @param amount - The amount to approve
 * @returns The user operation receipt
 */
async function approveTokenAllowance(
  smartAccount: any,
  tokenAddress: Address, 
  spenderAddress: Address, 
  amount: bigint
) {
  console.log(`\nApproving token allowance for ${tokenAddress} to spender ${spenderAddress}`);
  
  // Encode the approve function call
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, amount]
  });
  
  // Send the approve transaction via user operation
  const userOpResult = await smartAccount.sendUserOperation({
    network: NETWORK,
    calls: [
      {
        to: tokenAddress,
        data,
        value: BigInt(0),
      }
    ],
  });
  
  console.log(`Approval user operation hash: ${userOpResult.userOpHash}`);
  
  // Wait for approval user operation to be confirmed
  const receipt = await smartAccount.waitForUserOperation({
    userOpHash: userOpResult.userOpHash,
  });
  
  console.log(`Approval confirmed with status: ${receipt.status} ✅`);
  return receipt;
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