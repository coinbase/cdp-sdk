// Usage: pnpm tsx evm/viem.smartAccount.quoteSwapAndExecute.ts
//
// Required Dependencies: pnpm add permissionless viem@^2.0.0
//
// Required Environment Variables:
// - BUNDLER_URL: Your bundler service endpoint (e.g., Pimlico, Stackup, Alchemy AA)
// - VIEM_PRIVATE_KEY: Private key for the smart account owner
// - PAYMASTER_URL: Your paymaster service endpoint (optional, for gasless transactions)

/**
 * This example demonstrates the two-step swap approach using viem's smart account
 * (ERC-4337) capabilities with CDP's swap routing. This pattern gives you more
 * control and visibility compared to the all-in-one approach.
 * 
 * Why use the two-step approach with viem smart accounts?
 * - Inspect swap details before execution (rates, fees, gas estimates)
 * - Implement conditional logic based on swap parameters
 * - Better error handling and user confirmation flows
 * - More control over the execution timing
 * - Advanced account abstraction features and customization
 * 
 * This approach combines:
 * 1. CDP's swap quote creation and routing optimization
 * 2. Viem's account abstraction and user operation management
 * 3. Your choice of bundler and paymaster services
 * 4. Full control over quote analysis and execution decisions
 * 
 * Smart account benefits over regular accounts:
 * - Gasless transactions (with paymaster)
 * - Batch operations support (combine multiple actions)
 * - Custom validation logic
 * - Social recovery options
 * - Enhanced security features
 * 
 * Two-step process:
 * 1. Create quote: cdp.evm.createSwapQuote() with smart account as taker
 * 2. Execute swap: Manual user operation submission using viem smart account client
 * 
 * When to use this pattern:
 * - When you need to show users exact swap details before execution
 * - For implementing approval flows or confirmation dialogs
 * - When integrating with existing viem + account abstraction infrastructure
 * - For advanced trading applications that need precise control
 * - When you want to leverage specific bundler/paymaster features
 * 
 * For simpler smart account usage, consider CDP's built-in smart accounts.
 * For simpler viem usage, consider viem.smartAccount.swap.ts instead.
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
  encodeFunctionData,
  type Address,
  type Hex,
  concat,
  numberToHex,
  size
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { 
  createSmartAccountClient,
} from "permissionless";
import { 
  toSimpleSmartAccount,
} from "permissionless/accounts";
import { 
  createPimlicoClient,
} from "permissionless/clients/pimlico";
import { base } from "viem/chains";
import "dotenv/config";

// Network configuration
const NETWORK = "base"; // Base mainnet

// Define the entrypoint address constant
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

// Load configuration from environment variables
const BUNDLER_URL = process.env.BUNDLER_URL;
const PAYMASTER_URL = process.env.PAYMASTER_URL; // Optional for gasless transactions
const privateKey = process.env.VIEM_PRIVATE_KEY;

// Validate required configuration
if (!BUNDLER_URL) {
  console.error("❌ BUNDLER_URL environment variable not set.");
  console.log("💡 Sign up with a bundler provider:");
  console.log("   - Pimlico: https://pimlico.io");
  console.log("   - Stackup: https://stackup.sh");
  console.log("   - Alchemy AA: https://alchemy.com/account-abstraction");
  process.exit(1);
}

if (!privateKey) {
  console.error("❌ VIEM_PRIVATE_KEY environment variable not set");
  process.exit(1);
}

// Create viem account from private key (this will be the owner of the smart account)
const owner = privateKeyToAccount(`0x${privateKey}`);

// Create clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const walletClient = createWalletClient({
  account: owner,
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

// Create a CDP client for swap quotes
const cdp = new CdpClient();

async function main() {
  console.log(`Note: This example demonstrates two-step viem smart account swap execution on ${NETWORK} network.`);
  console.log(`Owner address: ${owner.address}`);

  try {
    // Create bundler client
    const bundlerClient = createPimlicoClient({
      transport: http(BUNDLER_URL),
      entryPoint: {
        address: ENTRYPOINT_ADDRESS_V07,
        version: "0.7"
      },
    });

    // Create a simple smart account
    const smartAccount = await toSimpleSmartAccount({
      client: publicClient,
      owner,
      entryPoint: {
        address: ENTRYPOINT_ADDRESS_V07,
        version: "0.7"
      },
      factoryAddress: "0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985", // SimpleAccount factory on Base
    });

    console.log(`Smart account address: ${smartAccount.address}`);

    // Create smart account client
    const smartAccountClient = createSmartAccountClient({
      account: smartAccount,
      chain: base,
      bundlerTransport: http(BUNDLER_URL),
      // Note: Paymaster configuration depends on your provider
      // middleware: PAYMASTER_URL ? {
      //   sponsorUserOperation: paymasterClient.sponsorUserOperation,
      // } : undefined,
    });

    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to send
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nInitiating two-step smart account swap: ${formatEther(fromAmount)} ${fromToken.symbol} → ${toToken.symbol}`);

    // Handle token allowance check and approval if needed (applicable when sending non-native assets only)
    if (!fromToken.isNativeAsset) {
      await handleTokenAllowance(
        smartAccount.address,
        smartAccountClient,
        bundlerClient,
        fromToken.address as Address,
        fromToken.symbol,
        fromAmount
      );
    }
    
    // STEP 1: Create the swap quote
    console.log("\n🔍 Step 1: Creating smart account swap quote using CDP API...");
    const swapQuote = await cdp.evm.createSwapQuote({
      network: NETWORK,
      toToken: toToken.address as Address,
      fromToken: fromToken.address as Address,
      fromAmount,
      taker: smartAccount.address,
      signerAddress: owner.address, // Owner will sign permit2 messages
      slippageBps: 100, // 1% slippage tolerance
    });
    
    // Check if swap is available
    if (!swapQuote.liquidityAvailable) {
      console.log("\n❌ Swap failed: Insufficient liquidity for this swap pair or amount.");
      console.log("Try reducing the swap amount or using a different token pair.");
      return;
    }
    
    // STEP 2: Inspect and validate the swap details
    console.log("\n📊 Step 2: Analyzing smart account swap quote...");
    displaySwapQuoteDetails(swapQuote, fromToken, toToken);
    
    // Validate the swap for any issues
    if (!validateSwapQuote(swapQuote)) {
      console.log("\n❌ Swap validation failed. Aborting execution.");
      return;
    }
    
    // STEP 3: Execute the swap via user operation
    console.log("\n🚀 Step 3: Executing swap via viem smart account user operation...");
    
    // Prepare the swap transaction data
    let txData = swapQuote.transaction!.data as Hex;
    
    // If permit2 is needed, sign it with the owner
    if (swapQuote.permit2?.eip712) {
      console.log("Signing Permit2 message...");
      
      const signature = await walletClient.signTypedData({
        account: owner,
        domain: swapQuote.permit2.eip712.domain,
        types: swapQuote.permit2.eip712.types,
        primaryType: swapQuote.permit2.eip712.primaryType,
        message: swapQuote.permit2.eip712.message,
      });
      
      // Calculate the signature length as a 32-byte hex value
      const signatureLengthInHex = numberToHex(size(signature), {
        signed: false,
        size: 32,
      });
      
      // Append the signature length and signature to the transaction data
      txData = concat([txData, signatureLengthInHex, signature]);
    }
    
    // Submit the swap as a user operation
    const userOpHash = await smartAccountClient.sendUserOperation({
      calls: [{
        to: swapQuote.transaction!.to as Address,
        value: swapQuote.transaction!.value ? BigInt(swapQuote.transaction!.value) : BigInt(0),
        data: txData,
      }],
    });
    
    console.log(`\n✅ Smart account swap submitted successfully!`);
    console.log(`User operation hash: ${userOpHash}`);
    console.log(`Smart account address: ${smartAccount.address}`);
    
    // Wait for the user operation to be included
    console.log("Waiting for user operation to be mined...");
    
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });
    
    console.log("\n🎉 Smart Account Swap User Operation Completed!");
    console.log(`Transaction hash: ${receipt.receipt.transactionHash}`);
    console.log(`Block number: ${receipt.receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.actualGasUsed}`);
    console.log(`Status: ${receipt.success ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`Transaction Explorer: https://basescan.org/tx/${receipt.receipt.transactionHash}`);
    
  } catch (error) {
    console.error("Error in two-step smart account swap process:", error);
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
  
  // Gas information for user operation
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
  
  // Viem smart account specific information
  console.log("\nViem Smart Account Execution Details:");
  console.log("------------------------------------");
  console.log("• Execution method: User Operation via viem account abstraction");
  console.log("• Owner signs Permit2 messages if required");
  console.log("• Uses your configured bundler service");
  console.log("• Optional paymaster support for gasless transactions");
  console.log("• Full control over account abstraction and user operation flow");
  console.log("• Supports batch operations for multiple actions in one user op");
}

/**
 * Validates the swap quote for any issues
 * @param swapQuote - The swap quote data
 * @returns true if swap is valid, false if there are issues
 */
function validateSwapQuote(swapQuote: any): boolean {
  console.log("\nValidating Smart Account Swap Quote:");
  console.log("===================================");
  
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
    console.log("   → Add funds to your smart account");
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
    console.log("   → Submit user operation to approve tokens");
    isValid = false;
  } else {
    console.log("✅ Sufficient allowance");
  }
  
  // Check simulation
  if (swapQuote.issues?.simulationIncomplete) {
    console.log("⚠️ WARNING: Simulation incomplete - user operation may fail");
    // Not marking as invalid since this is just a warning
  } else {
    console.log("✅ Simulation complete");
  }
  
  return isValid;
}

/**
 * Handles token allowance check and approval if needed for smart accounts
 * @param smartAccountAddress - The smart account address
 * @param smartAccountClient - The smart account client
 * @param bundlerClient - The bundler client for waiting on operations
 * @param tokenAddress - The address of the token to be sent
 * @param tokenSymbol - The symbol of the token
 * @param fromAmount - The amount to be sent
 */
async function handleTokenAllowance(
  smartAccountAddress: Address,
  smartAccountClient: any,
  bundlerClient: any,
  tokenAddress: Address,
  tokenSymbol: string,
  fromAmount: bigint
): Promise<void> {
  console.log("\n🔐 Checking smart account token allowance...");
  
  // Check allowance
  const currentAllowance = await getAllowance(
    smartAccountAddress,
    tokenAddress,
    tokenSymbol
  );
  
  if (currentAllowance < fromAmount) {
    console.log(`❌ Allowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(fromAmount)}`);
    
    // Encode approval call
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [PERMIT2_ADDRESS as Address, fromAmount]
    });
    
    // Send approval as user operation
    console.log("Sending approval via user operation...");
    
    const approvalOpHash = await smartAccountClient.sendUserOperation({
      calls: [{
        to: tokenAddress,
        value: 0n,
        data: approveData,
      }],
    });
    
    console.log(`Approval operation submitted: ${approvalOpHash}`);
    
    // Wait for approval to be mined
    const approvalReceipt = await bundlerClient.waitForUserOperationReceipt({
      hash: approvalOpHash,
    });
    
    console.log(`✅ Approval confirmed in block ${approvalReceipt.receipt.blockNumber}`);
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

// Show setup information
console.log("\n📦 Dependencies required:");
console.log("   pnpm add permissionless viem@^2.0.0");
console.log("\n🔧 Environment variables needed:");
console.log("   - BUNDLER_URL: Your bundler service endpoint (required)");
console.log("   - PAYMASTER_URL: Your paymaster service endpoint (optional)");
console.log("   - VIEM_PRIVATE_KEY: Private key for the smart account owner (required)");
console.log("\n💡 Bundler providers: Pimlico, Stackup, Alchemy Account Abstraction");
console.log("\n🔗 Useful for:");
console.log("   - Advanced trading applications");
console.log("   - Custom account abstraction flows");
console.log("   - Integration with existing viem + AA infrastructure");
console.log("   - Detailed swap analysis before execution");

main().catch(console.error); 