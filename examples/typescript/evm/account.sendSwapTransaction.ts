// Usage: pnpm tsx evm/account.sendSwapTransaction.ts

/**
 * This example demonstrates two approaches for performing token swaps:
 * 
 * Approach 1: All-in-one pattern (shown in main code)
 * - Uses account.swap() with inline options to create and execute swaps in a single call
 * - Automatically validates liquidity and throws an error if insufficient
 * - Simplest approach for straightforward swap scenarios
 * - Note: Currently requires type assertion due to TypeScript union type limitations
 * 
 * Approach 2: Create-then-submit pattern (shown in comments)
 * - First creates a swap quote object using cdp.evm.createSwapQuote()
 * - Allows inspection of swap details (buy amount, fees, etc.) before execution
 * - Provides more control for complex scenarios or when pre-validation is needed
 * - Uses account.swap() with the pre-created swap quote object
 * 
 * Both approaches:
 * - Handle Permit2 signatures automatically for ERC20 token swaps
 * - Check for and report liquidity issues
 * - Require proper token allowances (see handleTokenAllowance function)
 * 
 * Choose the approach based on your needs:
 * - Use Approach 1 for simple, direct swaps
 * - Use Approach 2 when you need to inspect swap details or handle complex logic
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
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// Create a CDP client
const cdp = new CdpClient();

async function main() {

  console.log(`Note: This example is using ${NETWORK} network. Make sure you have funds available.`);

  // Get or create an account to use for the swap
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SwapAccountWithOptions" });
  console.log(`\nUsing account: ${ownerAccount.address}`);

  try {
    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to send
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nInitiating swap of ${formatEther(fromAmount)} ${fromToken.symbol} for ${toToken.symbol}`);

    // Handle token allowance check and approval if needed (applicable when sending non-native assets only)
    if (!fromToken.isNativeAsset) {
      await handleTokenAllowance(
        ownerAccount.address as `0x${string}`, 
        fromToken.address as `0x${string}`,
        fromToken.symbol,
        fromAmount
      );
    }
    
    // Create and submit the swap transaction
    console.log("\nCreating and submitting swap in one call...");
    
    try {
      // Approach 1: All-in-one pattern
      // Create and execute the swap in one call - simpler but less control
      const result = await ownerAccount.swap({
        network: NETWORK,
        toToken: toToken.address as `0x${string}`,
        fromToken: fromToken.address as `0x${string}`,
        fromAmount,
        taker: ownerAccount.address,
        slippageBps: 100, // 1% slippage tolerance
      });

      /* Alternative - Approach 2: Create swap quote first, inspect it, then send it separately
      // This gives you more control to analyze the swap details before execution
      
      // Step 1: Create the swap quote
      const swapQuote = await cdp.evm.createSwapQuote({
        network: NETWORK,
        toToken: toToken.address as `0x${string}`,
        fromToken: fromToken.address as `0x${string}`,
        fromAmount,
        taker: ownerAccount.address,
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
      
      // Step 4: Send the swap transaction
      // Option A: Using account.swap() with the pre-created swap quote
      const result = await ownerAccount.swap({
        swapQuote: swapQuote,
      });
      
      // Option B: Using the swap quote's execute() method directly
      const result = await swapQuote.execute();
      */

      console.log(`\n✅ Swap submitted successfully!`);
      console.log(`Transaction hash: ${result.transactionHash}`);
      console.log(`Waiting for confirmation...`);

      // Wait for transaction confirmation using viem
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: result.transactionHash,
      });

      console.log("\nSwap Transaction Confirmed!");
      console.log(`Block number: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed}`);
      console.log(`Status: ${receipt.status === 'success' ? 'Success ✅' : 'Failed ❌'}`);
      console.log(`Transaction Explorer: https://basescan.org/tx/${result.transactionHash}`);
      
    } catch (error: any) {
      // The new pattern will throw an error if liquidity is not available
      if (error.message?.includes("Insufficient liquidity")) {
        console.log("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.");
        console.log("Try reducing the swap amount or using a different token pair.");
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error("Error executing swap:", error);
  }
}

/**
 * Handles token allowance check and approval if needed
 * @param ownerAddress - The address of the token owner
 * @param tokenAddress - The address of the token to be sent
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param fromAmount - The amount to be sent
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  ownerAddress: `0x${string}`, 
  tokenAddress: `0x${string}`,
  tokenSymbol: string,
  fromAmount: bigint
): Promise<void> {
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    ownerAddress, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < fromAmount) {
    console.log(`\nAllowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(fromAmount)}`);
    
    // Set the allowance to the required amount
    await approveTokenAllowance(
      ownerAddress,
      tokenAddress,
      PERMIT2_ADDRESS as `0x${string}`,
      fromAmount
    );
    console.log(`Set allowance to ${formatEther(fromAmount)} ${tokenSymbol}`);
  } else {
    console.log(`\nToken allowance sufficient. Current: ${formatEther(currentAllowance)} ${tokenSymbol}, Required: ${formatEther(fromAmount)} ${tokenSymbol}`);
  }
}

/**
 * Handle approval for token allowance if needed
 * This is necessary when swapping ERC20 tokens (not native ETH)
 * The Permit2 contract needs approval to move tokens on your behalf
 * @param ownerAddress - The token owner's address
 * @param tokenAddress - The token contract address
 * @param spenderAddress - The address allowed to spend the tokens
 * @param amount - The amount to approve
 * @returns The transaction receipt
 */
async function approveTokenAllowance(
  ownerAddress: `0x${string}`, 
  tokenAddress: `0x${string}`, 
  spenderAddress: `0x${string}`, 
  amount: bigint
) {
  console.log(`\nApproving token allowance for ${tokenAddress} to spender ${spenderAddress}`);
  
  // Encode the approve function call
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, amount]
  });
  
  // Send the approve transaction
  const txResult = await cdp.evm.sendTransaction({
    address: ownerAddress,
    network: NETWORK,
    transaction: {
      to: tokenAddress,
      data,
      value: BigInt(0),
    },
  });
  
  console.log(`Approval transaction hash: ${txResult.transactionHash}`);
  
  // Wait for approval transaction to be confirmed
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txResult.transactionHash,
  });
  
  console.log(`Approval confirmed in block ${receipt.blockNumber} ✅`);
  return receipt;
}

/**
 * Check token allowance for the Permit2 contract
 * @param owner - The token owner's address
 * @param token - The token contract address
 * @param symbol - The token symbol for logging
 * @returns The current allowance
 */
async function getAllowance(
  owner: `0x${string}`, 
  token: `0x${string}`,
  symbol: string
): Promise<bigint> {
  console.log(`\nChecking allowance for ${symbol} (${token}) to Permit2 contract...`);
  
  try {
    const allowance = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, PERMIT2_ADDRESS as `0x${string}`]
    });
    
    console.log(`Current allowance: ${formatEther(allowance)} ${symbol}`);
    return allowance;
  } catch (error) {
    console.error("Error checking allowance:", error);
    return BigInt(0);
  }
}

main().catch(console.error); 