// Usage: pnpm tsx evm/account.quoteSwapAndExecute.ts

/**
 * This example demonstrates the two-step swap approach using account.quoteSwap() 
 * followed by execution. This pattern gives you more control and visibility into
 * the swap process compared to the all-in-one account.swap() method.
 * 
 * Why use the two-step approach?
 * - Inspect swap details before execution (rates, fees, gas estimates)
 * - Implement conditional logic based on swap parameters
 * - Better error handling and user confirmation flows
 * - More control over the execution timing
 * - Ability to cache and reuse quotes (within their validity period)
 * 
 * Two-step process:
 * 1. Create quote: account.quoteSwap() - get swap details and transaction data
 * 2. Execute swap: account.swap({ swapQuote }) or swapQuote.execute()
 * 
 * When to use this pattern:
 * - When you need to show users exact swap details before execution
 * - For implementing approval flows or confirmation dialogs
 * - When you want to validate swap parameters programmatically
 * - For advanced trading applications that need precise control
 * 
 * For simpler use cases, consider account.swap() with inline options instead.
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
  console.log(`Note: This example is using ${NETWORK} network. Make sure you have funds available.`);

  // Get or create an account to use for the swap
  const ownerAccount = await cdp.evm.getOrCreateAccount({ name: "SwapQuoteAndExecuteAccount" });
  console.log(`\nUsing account: ${ownerAccount.address}`);

  try {
    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to send
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nInitiating two-step swap: ${formatEther(fromAmount)} ${fromToken.symbol} → ${toToken.symbol}`);

    // Handle token allowance check and approval if needed (applicable when sending non-native assets only)
    if (!fromToken.isNativeAsset) {
      await handleTokenAllowance(
        ownerAccount.address as Address, 
        fromToken.address as Address,
        fromToken.symbol,
        fromAmount
      );
    }
    
    // STEP 1: Create the swap quote
    console.log("\n🔍 Step 1: Creating swap quote...");
    const swapQuote = await ownerAccount.quoteSwap({
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

    // STEP 2: Inspect and validate the swap details
    console.log("\n📊 Step 2: Analyzing swap quote...");
    displaySwapQuoteDetails(swapQuote, fromToken, toToken);
    
    // Validate the swap for any issues
    if (!validateSwapQuote(swapQuote)) {
      console.log("\n❌ Swap validation failed. Aborting execution.");
      return;
    }

    // STEP 3: Execute the swap
    console.log("\n🚀 Step 3: Executing swap...");
    
    // Option A: Execute using account.swap() with the pre-created quote (RECOMMENDED)
    console.log("Executing swap using account.swap() with pre-created quote...");
    const result = await ownerAccount.swap({
      swapQuote: swapQuote,
    });

    // Option B: Execute using the quote's execute() method directly
    // const result = await swapQuote.execute();

    console.log(`\n✅ Swap submitted successfully!`);
    console.log(`Transaction hash: ${result.transactionHash}`);
    console.log(`Waiting for confirmation...`);

    // Wait for transaction confirmation using viem
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: result.transactionHash,
    });

    console.log("\n🎉 Swap Transaction Confirmed!");
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
    console.log(`Status: ${receipt.status === 'success' ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`Transaction Explorer: https://basescan.org/tx/${result.transactionHash}`);
    
  } catch (error) {
    console.error("Error in two-step swap process:", error);
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
  console.log("Swap Quote Details:");
  console.log("==================");
  
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
  
  // Fee information
  if (swapQuote.fees?.gasFee) {
    const gasFeeFormatted = formatEther(BigInt(swapQuote.fees.gasFee.amount));
    console.log(`💰 Gas Fee: ${gasFeeFormatted} ${swapQuote.fees.gasFee.token}`);
  }
  
  if (swapQuote.fees?.protocolFee) {
    const protocolFeeFormatted = formatUnits(
      BigInt(swapQuote.fees.protocolFee.amount), 
      swapQuote.fees.protocolFee.token === fromToken.symbol ? fromToken.decimals : toToken.decimals
    );
    console.log(`🏛️ Protocol Fee: ${protocolFeeFormatted} ${swapQuote.fees.protocolFee.token}`);
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
 * Handles token allowance check and approval if needed
 * @param ownerAddress - The address of the token owner
 * @param tokenAddress - The address of the token to be sent
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param fromAmount - The amount to be sent
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  ownerAddress: Address, 
  tokenAddress: Address,
  tokenSymbol: string,
  fromAmount: bigint
): Promise<void> {
  console.log("\n🔐 Checking token allowance...");
  
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    ownerAddress, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < fromAmount) {
    console.log(`❌ Allowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(fromAmount)}`);
    
    // Set the allowance to the required amount
    await approveTokenAllowance(
      ownerAddress,
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
  ownerAddress: Address, 
  tokenAddress: Address, 
  spenderAddress: Address, 
  amount: bigint
) {
  console.log(`\n📝 Approving token allowance for ${tokenAddress} to spender ${spenderAddress}`);
  
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
  owner: Address, 
  token: Address,
  symbol: string
): Promise<bigint> {
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