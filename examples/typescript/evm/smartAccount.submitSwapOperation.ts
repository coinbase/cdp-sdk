// Usage: pnpm tsx evm/smartAccount.submitSwapOperation.ts

/**
 * This example demonstrates how to perform token swaps using a CDP Smart Account (ERC-4337).
 * Key features of this approach:
 * 
 * 1. Uses account abstraction (AA) to execute swaps via user operations
 * 2. Smart account can batch multiple operations (e.g., approval + swap)
 * 3. Gas fees can be sponsored or paid in alternative tokens (depending on paymaster)
 * 4. No need for EOA to hold tokens - tokens are held by the smart account
 * 5. Owner signs user operations, smart account executes them onchain
 * 
 * This approach is ideal for:
 * - Apps that want to abstract away private key management
 * - Batching multiple operations in a single transaction
 * - Implementing advanced features like spending limits or multi-sig
 * - Gasless transactions (with appropriate paymaster setup)
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import type { EvmSmartAccount } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseEther, 
  createPublicClient, 
  http, 
  formatEther,
  erc20Abi,
  encodeFunctionData
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

  // Get or create a CDP EOA account. This will be the owner of the smart account.
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
  console.log(`\nUsing owner account: ${ownerAccount.address}`);
  
  // Create a CDP smart account with the regular account as the owner
  const smartAccount = await cdp.evm.createSmartAccount({
    owner: ownerAccount,
  });
  // Or retrieve an existing CDP smart account by its address (needs to be owned by owner)
  // const smartAccount = await cdp.evm.getSmartAccount({ address: "0x...", owner: ownerAccount });
  console.log(`Using smart account: ${smartAccount.address}`);

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
        smartAccount,
        sellToken.address as `0x${string}`,
        sellToken.symbol,
        sellAmount
      );
    }
    
    // Create the swap transaction
    console.log("\nCreating swap quote...");
    const swap = await cdp.evm.createSwap({
      network: NETWORK,
      buyToken: buyToken.address as `0x${string}`,
      sellToken: sellToken.address as `0x${string}`,
      sellAmount,
      taker: smartAccount.address, // Using the smart account as the taker
      slippageBps: 100, // 1% slippage tolerance
    });
    
    // Log swap details
    logSwapInfo(swap, sellToken, buyToken);
    
    // Validate the swap for any issues
    if (!validateSwap(swap)) {
      return;
    }
    
    // Submit the swap transaction
    console.log("\nSubmitting the swap via user operation...");

    const result = await smartAccount.swap({
      network: NETWORK,
      swap,
    });

    console.log(`User Operation Hash: ${result.userOpHash}`);
    console.log(`Status: ${result.status}`);
    
    // If you want to wait for the user operation to complete
    console.log("\nWaiting for user operation to be included in a transaction...");
    const finalResult = await smartAccount.waitForUserOperation({
      userOpHash: result.userOpHash,
    });

    console.log("\nSwap User Operation Completed!");
    console.log(`Status: ${finalResult.status}`);
    
    // Check if the operation completed successfully (has a transaction hash)
    if (finalResult.status === "complete" && "transactionHash" in finalResult) {
      const txHash = finalResult.transactionHash as `0x${string}`;
      console.log(`Transaction hash: ${txHash}`);
      
      // Wait for transaction confirmation using viem
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      console.log("\nSwap Transaction Confirmed!");
      console.log(`Block number: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed}`);
      console.log(`Status: ${receipt.status === 'success' ? 'Success ✅' : 'Failed ❌'}`);
      console.log(`Transaction Explorer: https://basescan.org/tx/${txHash}`);
    } else {
      console.log("No transaction hash available. The operation might have failed.");
    }
  } catch (error) {
    console.error("Error executing swap:", error);
  }
}

/**
 * Handles token allowance check and approval if needed
 * @param smartAccount - The smart account that holds the tokens
 * @param tokenAddress - The address of the token to be sold
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param sellAmount - The amount to be sold
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  smartAccount: EvmSmartAccount,
  tokenAddress: `0x${string}`,
  tokenSymbol: string,
  sellAmount: bigint
): Promise<void> {
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    smartAccount.address, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < sellAmount) {
    console.log(`\nAllowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(sellAmount)}`);
    
    // Set the allowance to the required amount
    await approveTokenAllowance(
      smartAccount,
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
 * @param smartAccount - The smart account that holds the tokens and needs to approve
 * @param tokenAddress - The token contract address
 * @param spenderAddress - The address allowed to spend the tokens
 * @param amount - The amount to approve
 * @returns The transaction receipt
 */
async function approveTokenAllowance(
  smartAccount: EvmSmartAccount,
  tokenAddress: `0x${string}`, 
  spenderAddress: `0x${string}`, 
  amount: bigint
) {
  console.log(`\nApproving token allowance for ${tokenAddress} to spender ${spenderAddress}`);
  
  // IMPORTANT: Since tokens are held by the Smart Account, the Smart Account itself
  // must execute the approval transaction. This requires a separate user operation
  // signed by the owner.
  
  // Encode the approve function call
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, amount]
  });
  
  // Create a user operation for the smart account to approve the tokens
  const result = await smartAccount.sendUserOperation({
    network: NETWORK,
    calls: [
      {
        to: tokenAddress,
        data,
        value: BigInt(0),
      }
    ]
  });
  
  console.log(`Approval user operation hash: ${result.userOpHash}`);
  console.log(`Approval status: ${result.status}`);
  
  // Wait for the user operation to complete
  const finalResult = await smartAccount.waitForUserOperation({
    userOpHash: result.userOpHash,
  });
  
  if (finalResult.status === "complete" && "transactionHash" in finalResult) {
    const txHash = finalResult.transactionHash as `0x${string}`;
    
    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    
    console.log(`Approval confirmed in block ${receipt.blockNumber} ✅`);
    return receipt;
  } else {
    console.log("Approval operation might have failed");
    throw new Error("Approval operation did not complete successfully");
  }
}

/**
 * Check token allowance for the Permit2 contract
 * @param ownerAddress - The owner's address
 * @param token - The token contract address
 * @param symbol - The token symbol for logging
 * @returns The current allowance
 */
async function getAllowance(
  ownerAddress: `0x${string}`, 
  token: `0x${string}`,
  symbol: string
): Promise<bigint> {
  console.log(`\nChecking allowance for ${symbol} (${token}) to Permit2 contract...`);
  
  try {
    const allowance = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [ownerAddress, PERMIT2_ADDRESS as `0x${string}`]
    });
    
    console.log(`Current allowance: ${formatEther(allowance)} ${symbol}`);
    return allowance;
  } catch (error) {
    console.error("Error checking allowance:", error);
    return BigInt(0);
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
  if ('transaction' in swap) {
    console.log(`Gas: ${swap.transaction.gas}`);
    console.log(`Gas Price: ${swap.transaction.gasPrice}`);
  }
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

main().catch(console.error); 