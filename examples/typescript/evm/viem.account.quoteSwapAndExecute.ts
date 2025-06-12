// Usage: pnpm tsx evm/viem.account.quoteSwapAndExecute.ts
//
// Required Environment Variable:
// - VIEM_WALLET_PRIVATE_KEY: The private key of the wallet to use for transactions

/**
 * This example demonstrates the two-step swap approach using viem wallets with CDP's API.
 * This pattern gives you more control and visibility compared to the all-in-one approach.
 * 
 * Why use the two-step approach with viem?
 * - Inspect swap details before execution (rates, fees, gas estimates)
 * - Implement conditional logic based on swap parameters
 * - Better error handling and user confirmation flows
 * - More control over the execution timing
 * - Full integration with existing viem wallet infrastructure
 * 
 * This approach combines:
 * 1. CDP's optimal swap routing and pricing
 * 2. Viem's flexible wallet and transaction management
 * 3. Manual control over the entire swap process
 * 
 * Two-step process:
 * 1. Create quote: cdp.evm.createSwapQuote() with viem wallet as taker
 * 2. Execute swap: Manual transaction submission using viem wallet client
 * 
 * When to use this pattern:
 * - When you need to show users exact swap details before execution
 * - For implementing approval flows or confirmation dialogs
 * - When integrating with existing viem-based applications
 * - For advanced trading applications that need precise control
 * 
 * For simpler use cases, consider viem.account.swap.ts instead.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseUnits, 
  createPublicClient, 
  createWalletClient,
  http,
  formatEther,
  erc20Abi,
  concat,
  numberToHex,
  size,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import "dotenv/config";

// Network configuration
const NETWORK = "base"; // Base mainnet

// Create viem clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const walletClient = createWalletClient({
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

// Create a CDP client for swap quote creation
const cdp = new CdpClient();

async function main() {
  console.log(`Note: This example demonstrates two-step swap execution using ${NETWORK} network with a viem wallet.`);
  
  // Get the private key from environment variable
  const privateKey = process.env.VIEM_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Please set VIEM_WALLET_PRIVATE_KEY in your .env file");
  }
  
  // Create a viem account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`\nUsing viem wallet: ${account.address}`);
  
  // Check ETH balance for context
  const balance = await publicClient.getBalance({
    address: account.address,
  });
  console.log(`Wallet ETH Balance: ${formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.log("\n⚠️  Warning: Your wallet has no ETH. You'll need ETH for gas fees.");
    return;
  }

  try {
    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to swap
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nInitiating two-step swap: ${formatEther(fromAmount)} ${fromToken.symbol} → ${toToken.symbol}`);

    // Handle token allowance check and approval if needed (applicable when sending non-native assets only)
    if (!fromToken.isNativeAsset) {
      await handleTokenAllowance(
        account,
        fromToken.address as Address,
        fromToken.symbol,
        fromAmount
      );
    }

    // STEP 1: Create the swap quote
    console.log("\n🔍 Step 1: Creating swap quote using CDP API...");
    const swapQuote = await cdp.evm.createSwapQuote({
      network: NETWORK,
      toToken: toToken.address as Address,
      fromToken: fromToken.address as Address,
      fromAmount,
      taker: account.address, // Using viem wallet address as taker
      slippageBps: 100, // 1% slippage tolerance
    });
    
    // Check if swap quote is available
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
    
    // STEP 3: Execute the swap using viem
    console.log("\n🚀 Step 3: Executing swap using viem wallet...");
    
    // Prepare transaction data
    let txData = swapQuote.transaction!.data as Hex;
    
    // Handle Permit2 signature if needed
    if (swapQuote.permit2?.eip712) {
      console.log("Signing Permit2 message...");
      
      // Sign the Permit2 typed data message
      const signature = await account.signTypedData({
        domain: swapQuote.permit2.eip712.domain,
        types: swapQuote.permit2.eip712.types,
        primaryType: swapQuote.permit2.eip712.primaryType,
        message: swapQuote.permit2.eip712.message,
      });
      
      console.log("Permit2 signature obtained");
      
      // Calculate the signature length as a 32-byte hex value
      const signatureLengthInHex = numberToHex(size(signature), {
        signed: false,
        size: 32,
      });
      
      // Append the signature length and signature to the transaction data
      txData = concat([txData, signatureLengthInHex, signature]);
    }
    
    // Send the transaction using viem
    const hash = await walletClient.sendTransaction({
      account,
      to: swapQuote.transaction!.to as Address,
      data: txData,
      value: swapQuote.transaction!.value ? BigInt(swapQuote.transaction!.value) : BigInt(0),
      gas: swapQuote.transaction!.gas ? BigInt(swapQuote.transaction!.gas) : undefined,
      gasPrice: swapQuote.transaction!.gasPrice ? BigInt(swapQuote.transaction!.gasPrice) : undefined,
    });

    console.log(`\n✅ Swap submitted successfully!`);
    console.log(`Transaction hash: ${hash}`);
    console.log(`Waiting for confirmation...`);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    console.log("\n🎉 Swap Transaction Confirmed!");
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
    console.log(`Status: ${receipt.status === 'success' ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`Transaction Explorer: https://basescan.org/tx/${hash}`);
    
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
  
  // Viem-specific execution notes
  console.log("\nViem Execution Details:");
  console.log("----------------------");
  console.log("• Using viem wallet for transaction signing and submission");
  console.log("• Manual Permit2 signature handling if required");
  console.log("• Direct transaction submission to the network");
  console.log("• Full control over gas settings and transaction parameters");
}

/**
 * Validates the swap quote for any issues
 * @param swapQuote - The swap quote data
 * @returns true if swap is valid, false if there are issues
 */
function validateSwapQuote(swapQuote: any): boolean {
  console.log("\nValidating Swap Quote:");
  console.log("=====================");
  
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
    console.log("   → Add funds to your wallet");
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
    console.log("   → Approve tokens for the Permit2 contract");
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
 * @param account - The viem account
 * @param tokenAddress - The address of the token to be sent
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param fromAmount - The amount to be sent
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  account: any,
  tokenAddress: Address,
  tokenSymbol: string,
  fromAmount: bigint
): Promise<void> {
  console.log("\n🔐 Checking token allowance...");
  
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    account.address, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < fromAmount) {
    console.log(`❌ Allowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(fromAmount)}`);
    
    // Set the allowance to the required amount
    await approveTokenAllowance(
      account,
      tokenAddress,
      PERMIT2_ADDRESS as Address,
      fromAmount
    );
    console.log(`✅ Set allowance to ${formatEther(fromAmount)} ${tokenSymbol}`);
  } else {
    console.log(`✅ Token allowance sufficient. Current: ${formatEther(currentAllowance)} ${tokenSymbol}`);
  }
}

/**
 * Handle approval for token allowance if needed using viem
 * This is necessary when swapping ERC20 tokens (not native ETH)
 * The Permit2 contract needs approval to move tokens on your behalf
 * @param account - The viem account
 * @param tokenAddress - The token contract address
 * @param spenderAddress - The address allowed to spend the tokens
 * @param amount - The amount to approve
 * @returns The transaction receipt
 */
async function approveTokenAllowance(
  account: any,
  tokenAddress: Address, 
  spenderAddress: Address, 
  amount: bigint
) {
  console.log(`\n📝 Approving token allowance for ${tokenAddress} to spender ${spenderAddress}`);
  
  // Send the approve transaction using viem
  const hash = await walletClient.writeContract({
    account,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, amount],
  });
  
  console.log(`Approval transaction hash: ${hash}`);
  
  // Wait for approval transaction to be confirmed
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
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
      args: [owner, PERMIT2_ADDRESS as Address]
    });
    
    console.log(`Current allowance: ${formatEther(allowance)} ${symbol}`);
    return allowance;
  } catch (error) {
    console.error("Error checking allowance:", error);
    return BigInt(0);
  }
}

main().catch(console.error); 