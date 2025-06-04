// Usage: pnpm tsx evm/viem.quoteSwap.ts
//
// Required Environment Variable:
// - VIEM_WALLET_PRIVATE_KEY: The private key of the wallet to use as the taker

/**
 * This example demonstrates how to create swap quotes using a viem wallet
 * with CDP's swap quote API. This approach is useful when you want to:
 * 
 * 1. Use your own viem wallet for taker address specification
 * 2. Create quotes for external execution (not using CDP-managed accounts)
 * 3. Integrate CDP's swap pricing into your own transaction flow
 * 4. Build custom UIs that show detailed swap information before execution
 * 
 * Key differences from CDP account.quoteSwap():
 * - Uses viem wallet address as the taker (instead of CDP account address)
 * - Requires manual private key management
 * - More control over wallet integration
 * - Can be used in dApps with existing viem wallet setups
 * 
 * This example focuses on quote creation and analysis. For full swap execution
 * with viem wallets, see viem.swap.ts
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseUnits, 
  createPublicClient, 
  http,
  formatEther,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import "dotenv/config";

// Network configuration
const NETWORK = "base"; // Base mainnet

// Create viem public client for balance checks
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

// Create a CDP client for swap quote creation
const cdp = new CdpClient();

async function main() {
  console.log(`Note: This example creates swap quotes using ${NETWORK} network with a viem wallet.`);
  
  // Get the private key from environment variable
  const privateKey = process.env.VIEM_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Please set VIEM_WALLET_PRIVATE_KEY in your .env file");
  }
  
  // Create a viem account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`\nUsing viem wallet as taker: ${account.address}`);
  
  // Check ETH balance for context
  const balance = await publicClient.getBalance({
    address: account.address,
  });
  console.log(`Wallet ETH Balance: ${formatEther(balance)} ETH`);

  try {
    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to quote
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\n🔍 Creating swap quote for: ${formatEther(fromAmount)} ${fromToken.symbol} → ${toToken.symbol}`);

    // Check token balance for the from token
    if (!fromToken.isNativeAsset) {
      const tokenBalance = await getTokenBalance(account.address, fromToken.address as Address, fromToken.decimals);
      console.log(`${fromToken.symbol} Balance: ${tokenBalance} ${fromToken.symbol}`);
      
      if (parseFloat(tokenBalance) === 0) {
        console.log(`⚠️  Warning: You have no ${fromToken.symbol} in your wallet.`);
      }
    }
    
    // Create the swap quote using CDP API with viem wallet as taker
    console.log("\n📊 Fetching swap quote from CDP API...");
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
      console.log("\n❌ Swap quote unavailable: Insufficient liquidity for this swap pair or amount.");
      console.log("Try reducing the swap amount or using a different token pair.");
      return;
    }
    
    console.log("\n✅ Swap quote created successfully!");
    
    // Display comprehensive quote analysis
    displayDetailedQuoteAnalysis(swapQuote, fromToken, toToken, account.address);
    
    // Validate the quote and show any issues
    validateQuoteForExecution(swapQuote);
    
    // Show next steps
    console.log("\n🚀 Next Steps:");
    console.log("===============");
    console.log("1. Review the quote details above");
    console.log("2. Ensure you have sufficient token allowances for Permit2 contract");
    console.log("3. Execute the swap using:");
    console.log("   - viem.swap.ts (full viem implementation)");
    console.log("   - swapQuote.execute() method");
    console.log("   - Or integrate the transaction data into your own execution flow");
    
    // Show transaction details for manual execution
    if (swapQuote.transaction) {
      console.log("\n📋 Transaction Details for Manual Execution:");
      console.log("===========================================");
      console.log(`To: ${swapQuote.transaction.to}`);
      console.log(`Data: ${swapQuote.transaction.data?.substring(0, 50)}...`);
      console.log(`Value: ${swapQuote.transaction.value?.toLocaleString() || '0'} wei`);
      console.log(`Gas: ${swapQuote.transaction.gas?.toLocaleString() || 'Not specified'}`);
      console.log(`Gas Price: ${swapQuote.transaction.gasPrice?.toLocaleString() || 'Not specified'}`);
      
      if (swapQuote.permit2?.eip712) {
        console.log("\n⚠️  This swap requires Permit2 signature:");
        console.log("- You'll need to sign the EIP-712 message");
        console.log("- Then append the signature to the transaction data");
        console.log("- See viem.swap.ts for full implementation");
      }
    }
    
  } catch (error) {
    console.error("Error creating swap quote:", error);
  }
}

/**
 * Displays comprehensive analysis of the swap quote
 * @param swapQuote - The swap quote data
 * @param fromToken - The token being sent
 * @param toToken - The token being received
 * @param takerAddress - The address that will perform the swap
 */
function displayDetailedQuoteAnalysis(
  swapQuote: any,
  fromToken: typeof TOKENS.WETH,
  toToken: typeof TOKENS.USDC,
  takerAddress: Address
): void {
  console.log("\n📈 Detailed Quote Analysis:");
  console.log("===========================");
  
  // Basic amounts
  const fromAmountFormatted = formatUnits(BigInt(swapQuote.fromAmount), fromToken.decimals);
  const toAmountFormatted = formatUnits(BigInt(swapQuote.toAmount), toToken.decimals);
  const minToAmountFormatted = formatUnits(BigInt(swapQuote.minToAmount), toToken.decimals);
  
  console.log(`📤 Sending: ${fromAmountFormatted} ${fromToken.symbol}`);
  console.log(`📥 Receiving: ${toAmountFormatted} ${toToken.symbol}`);
  console.log(`🔒 Guaranteed Minimum: ${minToAmountFormatted} ${toToken.symbol}`);
  console.log(`👤 Taker: ${takerAddress}`);
  
  // Price calculations
  const exchangeRate = Number(swapQuote.toAmount) / Number(swapQuote.fromAmount) * 
                      Math.pow(10, fromToken.decimals - toToken.decimals);
  const minExchangeRate = Number(swapQuote.minToAmount) / Number(swapQuote.fromAmount) * 
                         Math.pow(10, fromToken.decimals - toToken.decimals);
  
  console.log(`\n💱 Exchange Rates:`);
  console.log(`Expected: 1 ${fromToken.symbol} = ${exchangeRate.toFixed(6)} ${toToken.symbol}`);
  console.log(`Worst Case: 1 ${fromToken.symbol} = ${minExchangeRate.toFixed(6)} ${toToken.symbol}`);
  
  // Slippage analysis
  const slippagePercent = ((Number(swapQuote.toAmount) - Number(swapQuote.minToAmount)) / 
                          Number(swapQuote.toAmount) * 100);
  const priceImpact = slippagePercent;
  
  console.log(`\n📉 Slippage & Impact:`);
  console.log(`Max Slippage: ${slippagePercent.toFixed(2)}%`);
  console.log(`Price Impact: ${priceImpact.toFixed(2)}%`);
  
  // Gas and fee information
  console.log(`\n⛽ Gas Information:`);
  if (swapQuote.transaction?.gas) {
    console.log(`Estimated Gas: ${swapQuote.transaction.gas.toLocaleString()}`);
  }
  if (swapQuote.transaction?.gasPrice) {
    const gasPriceGwei = Number(swapQuote.transaction.gasPrice) / 1e9;
    console.log(`Gas Price: ${gasPriceGwei.toFixed(2)} Gwei`);
    
    if (swapQuote.transaction.gas) {
      const estimatedGasCost = swapQuote.transaction.gas * swapQuote.transaction.gasPrice;
      console.log(`Estimated Gas Cost: ${formatEther(BigInt(estimatedGasCost))} ETH`);
    }
  }
  
  // Fee breakdown
  if (swapQuote.fees) {
    console.log(`\n💰 Fee Breakdown:`);
    
    if (swapQuote.fees.gasFee) {
      const gasFeeFormatted = formatEther(BigInt(swapQuote.fees.gasFee.amount));
      console.log(`Gas Fee: ${gasFeeFormatted} ${swapQuote.fees.gasFee.token}`);
    }
    
    if (swapQuote.fees.protocolFee) {
      const protocolFeeFormatted = formatUnits(
        BigInt(swapQuote.fees.protocolFee.amount), 
        swapQuote.fees.protocolFee.token === fromToken.symbol ? fromToken.decimals : toToken.decimals
      );
      console.log(`Protocol Fee: ${protocolFeeFormatted} ${swapQuote.fees.protocolFee.token}`);
    }
  }
  
  // Route information (if available)
  if (swapQuote.route) {
    console.log(`\n🛣️  Swap Route:`);
    console.log(`Route: ${JSON.stringify(swapQuote.route, null, 2)}`);
  }
  
  // Block information
  if (swapQuote.blockNumber) {
    console.log(`\n📦 Quote Block: ${swapQuote.blockNumber}`);
  }
}

/**
 * Validates the swap quote and shows any issues that need to be addressed
 * @param swapQuote - The swap quote data
 */
function validateQuoteForExecution(swapQuote: any): void {
  console.log("\n🔍 Execution Readiness Check:");
  console.log("==============================");
  
  let readyForExecution = true;
  
  // Check liquidity
  if (!swapQuote.liquidityAvailable) {
    console.log("❌ Liquidity: Not available");
    readyForExecution = false;
  } else {
    console.log("✅ Liquidity: Available");
  }
  
  // Check for issues
  if (swapQuote.issues) {
    // Balance issues
    if (swapQuote.issues.balance) {
      console.log("❌ Balance Issues Detected:");
      console.log(`   Current: ${swapQuote.issues.balance.currentBalance}`);
      console.log(`   Required: ${swapQuote.issues.balance.requiredBalance}`);
      console.log(`   Token: ${swapQuote.issues.balance.token}`);
      console.log("   → Action: Add more tokens to your wallet");
      readyForExecution = false;
    } else {
      console.log("✅ Balance: Sufficient");
    }
    
    // Allowance issues
    if (swapQuote.issues.allowance) {
      console.log("❌ Allowance Issues Detected:");
      console.log(`   Current: ${swapQuote.issues.allowance.currentAllowance}`);
      console.log(`   Required: ${swapQuote.issues.allowance.requiredAllowance}`);
      console.log(`   Spender: ${swapQuote.issues.allowance.spender}`);
      console.log("   → Action: Approve tokens for the Permit2 contract");
      readyForExecution = false;
    } else {
      console.log("✅ Allowance: Sufficient");
    }
    
    // Simulation issues
    if (swapQuote.issues.simulationIncomplete) {
      console.log("⚠️  Simulation: Incomplete (transaction may fail)");
      console.log("   → Proceed with caution");
    } else {
      console.log("✅ Simulation: Complete");
    }
  }
  
  // Overall readiness
  console.log(`\n📋 Overall Status: ${readyForExecution ? '✅ Ready for Execution' : '❌ Issues Need Resolution'}`);
  
  if (!readyForExecution) {
    console.log("\n⚠️  Please resolve the issues above before attempting to execute the swap.");
  }
}

/**
 * Get token balance for a given address
 * @param address - The wallet address
 * @param tokenAddress - The token contract address
 * @param decimals - The token decimals
 * @returns Formatted token balance
 */
async function getTokenBalance(
  address: Address,
  tokenAddress: Address,
  decimals: number
): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ type: 'address' }],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [address],
    });
    
    return formatUnits(balance as bigint, decimals);
  } catch (error) {
    console.error("Error checking token balance:", error);
    return "0";
  }
}

main().catch(console.error); 