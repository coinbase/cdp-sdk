// Usage: pnpm tsx evm/account.submitSwapTransaction.ts

/**
 * This example demonstrates how to perform a complete token swap using a CDP-managed account.
 * Key features of this approach:
 * 
 * 1. Uses CDP's account.swap() method which handles the entire swap flow
 * 2. Automatically manages Permit2 signatures for ERC20 token swaps
 * 3. Handles token allowance checks and approvals when needed
 * 4. Uses CDP's transaction management for reliable execution
 * 5. Provides detailed swap information including exchange rates and price impact
 * 
 * This is the simplest way to execute swaps if you're already using CDP accounts.
 * The SDK abstracts away the complexity of Permit2 signatures and transaction
 * construction, making it ideal for applications that want a streamlined experience.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
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
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
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
    
    // Create the swap transaction
    console.log("\nCreating swap quote...");
    const swapResponse = await cdp.evm.createSwap({
      network: NETWORK,
      buyToken: buyToken.address as `0x${string}`,
      sellToken: sellToken.address as `0x${string}`,
      sellAmount,
      taker: ownerAccount.address,
      slippageBps: 100, // 1% slippage tolerance
    });
    
    // Check if swap is available (handle the union type)
    if (!('transaction' in swapResponse) || !swapResponse.liquidityAvailable) {
      console.log("\n❌ Swap unavailable. Insufficient liquidity or other issues.");
      return;
    }
    
    // Type assertion after checking
    const swap = swapResponse as any;
    
    // Log swap details
    logSwapInfo(swap, sellToken, buyToken);
    
    // Validate the swap for any issues
    if (!validateSwap(swap)) {
      return;
    }
    
    // Submit the swap transaction
    console.log("\nSubmitting the swap onchain...");

    // Use the CDP account to submit the swap
    // The swap method automatically handles Permit2 signatures if needed
    const result = await ownerAccount.swap({
      network: NETWORK,
      swap,
    });

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
    
  } catch (error) {
    console.error("Error creating swap:", error);
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

  console.log("\nSwap Transaction Created:");
  console.log("-------------------------");
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
  if (!swap.liquidityAvailable) {
    console.log("Insufficient liquidity available for this swap.");
    return false;
  }
  
  if (swap.issues.balance) {
    console.log("\nBalance Issues:");
    console.log(`Current Balance: ${swap.issues.balance.currentBalance}`);
    console.log(`Required Balance: ${swap.issues.balance.requiredBalance}`);
    console.log(`Token: ${swap.issues.balance.token}`);
    console.log("\nInsufficient balance. Please add funds to your account.");
    return false;
  }

  if (swap.issues.simulationIncomplete) {
    console.log("\n⚠️ WARNING: Simulation incomplete. Transaction may fail.");
  }
  
  return true;
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