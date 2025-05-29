// Usage: pnpm tsx evm/account.submitSwapTransaction.ts

/**
 * This example demonstrates how to perform a token swap using the new all-in-one pattern.
 * Key features of this approach:
 * 
 * 1. Uses account.swap() with swapOptions to create and execute swap in one call
 * 2. Automatically handles liquidity checks and throws error if insufficient
 * 3. Simplifies the swap flow by combining createSwap and submitSwapTransaction
 * 4. Still handles Permit2 signatures automatically for ERC20 token swaps
 * 5. Provides a more streamlined API for common swap use cases
 * 
 * This is the simplest way to execute swaps when you don't need to inspect the
 * swap details before execution. The SDK will automatically check liquidity and
 * throw an error if the swap cannot be executed.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  parseEther, 
  createPublicClient, 
  http, 
  erc20Abi,
  encodeFunctionData,
  formatEther
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
    const sellToken = TOKENS.WETH;
    const buyToken = TOKENS.USDC;
    
    // Set the amount we want to sell
    const sellAmount = parseEther("0.1"); // 0.1 WETH
    
    console.log(`\nInitiating swap of ${formatEther(sellAmount)} ${sellToken.symbol} for ${buyToken.symbol}`);

    // Handle token allowance check and approval if needed (applicable when selling non-native assets only)
    if (!sellToken.isNativeAsset) {
      await handleTokenAllowance(
        ownerAccount.address as `0x${string}`, 
        sellToken.address as `0x${string}`,
        sellToken.symbol,
        sellAmount
      );
    }
    
    // Submit the swap transaction using the new all-in-one pattern
    console.log("\nCreating and submitting swap in one call...");
    
    try {
      // Use the new swapOptions pattern - this creates and executes the swap in one call
      const result = await ownerAccount.swap({
        network: NETWORK,
        buyToken: buyToken.address as `0x${string}`,
        sellToken: sellToken.address as `0x${string}`,
        sellAmount,
        taker: ownerAccount.address,
        slippageBps: 100, // 1% slippage tolerance
      });

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
 * @param tokenAddress - The address of the token to be sold
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param sellAmount - The amount to be sold
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  ownerAddress: `0x${string}`, 
  tokenAddress: `0x${string}`,
  tokenSymbol: string,
  sellAmount: bigint
): Promise<void> {
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    ownerAddress, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < sellAmount) {
    console.log(`\nAllowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(sellAmount)}`);
    
    // Set the allowance to the required amount
    await approveTokenAllowance(
      ownerAddress,
      tokenAddress,
      PERMIT2_ADDRESS as `0x${string}`,
      sellAmount
    );
    console.log(`Set allowance to ${formatEther(sellAmount)} ${tokenSymbol}`);
  } else {
    console.log(`\nToken allowance sufficient. Current: ${formatEther(currentAllowance)} ${tokenSymbol}, Required: ${formatEther(sellAmount)} ${tokenSymbol}`);
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