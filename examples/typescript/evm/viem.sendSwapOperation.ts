// Usage: pnpm tsx evm/viem.sendSwapOperation.ts

/**
 * This example demonstrates how to perform token swaps using viem's account abstraction
 * capabilities with a smart account (ERC-4337), while using CDP's swap creation API.
 * 
 * Key differences from CDP smart accounts:
 * 1. Uses viem's bundler client and smart account implementation
 * 2. Requires your own bundler and paymaster URLs
 * 3. More control over the user operation flow
 * 4. Still uses CDP API for optimal swap routing
 * 
 * Prerequisites:
 * - A bundler service URL (e.g., Pimlico, Stackup, Alchemy AA)
 * - Optional: A paymaster service URL for gasless transactions
 * - Smart account implementation (e.g., SimpleAccount, Safe, Kernel)
 * 
 * NOTE: This example requires the 'permissionless' package to be installed:
 * pnpm add permissionless viem@^2.0.0
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

// IMPORTANT: Configure your bundler and paymaster URLs
// You'll need to sign up with a bundler provider like Pimlico, Stackup, or Alchemy
const BUNDLER_URL = process.env.BUNDLER_URL;
const PAYMASTER_URL = process.env.PAYMASTER_URL; // Optional for gasless transactions

if (!BUNDLER_URL) {
  throw new Error("BUNDLER_URL environment variable not set. Please configure a bundler service.");
}

// Load private key from environment variable
const privateKey = process.env.VIEM_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("VIEM_PRIVATE_KEY environment variable not set");
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
  console.log(`Note: This example is using ${NETWORK} network with viem account abstraction.`);
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
      // Note: If you need paymaster sponsorship, you'll need to configure it
      // according to your paymaster provider's requirements
    });

    // Define the tokens we're working with
    const fromToken = TOKENS.WETH;
    const toToken = TOKENS.USDC;
    
    // Set the amount we want to send
    const fromAmount = parseUnits("0.1", fromToken.decimals); // 0.1 WETH
    
    console.log(`\nInitiating swap of ${formatEther(fromAmount)} ${fromToken.symbol} for ${toToken.symbol}`);
    
    // Check and handle token allowance if needed
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
    
    // Create the swap quote using CDP API
    console.log("\nCreating swap quote using CDP API...");
    const swapResult = await cdp.evm.createSwapQuote({
      network: NETWORK,
      toToken: toToken.address as Address,
      fromToken: fromToken.address as Address,
      fromAmount,
      taker: smartAccount.address,
      signerAddress: owner.address, // Owner will sign permit2 messages
      slippageBps: 100, // 1% slippage tolerance
    });
    
    // Check if swap is available
    if (!swapResult.liquidityAvailable) {
      console.log("\n❌ Swap unavailable. Insufficient liquidity for this swap pair or amount.");
      console.log("Try reducing the swap amount or using a different token pair.");
      return;
    }
    
    // At this point, swapResult is CreateSwapQuoteResult
    const swap = swapResult;
    
    // Log swap details
    logSwapInfo(swap, fromToken, toToken);
    
    // Validate the swap
    if (!validateSwap(swap)) {
      return;
    }
    
    // Prepare the swap transaction data
    let txData = swap.transaction!.data as Hex;
    
    // If permit2 is needed, sign it with the owner
    if (swap.permit2?.eip712) {
      console.log("\nSigning Permit2 message...");
      
      const signature = await walletClient.signTypedData({
        account: owner,
        domain: swap.permit2.eip712.domain,
        types: swap.permit2.eip712.types,
        primaryType: swap.permit2.eip712.primaryType,
        message: swap.permit2.eip712.message,
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
    console.log("\nSubmitting swap via user operation...");
    
    const userOpHash = await smartAccountClient.sendUserOperation({
      calls: [{
        to: swap.transaction!.to as Address,
        value: swap.transaction!.value ? BigInt(swap.transaction!.value) : BigInt(0),
        data: txData,
      }],
    });
    
    console.log(`User operation submitted: ${userOpHash}`);
    
    // Wait for the user operation to be included
    console.log("Waiting for user operation to be mined...");
    
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });
    
    console.log("\n🎉 Swap User Operation Completed!");
    console.log(`Transaction hash: ${receipt.receipt.transactionHash}`);
    console.log(`Block number: ${receipt.receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.actualGasUsed}`);
    console.log(`Transaction Explorer: https://basescan.org/tx/${receipt.receipt.transactionHash}`);
    
  } catch (error) {
    console.error("Error executing swap:", error);
  }
}

/**
 * Handles token allowance check and approval if needed
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
  // Check allowance
  const currentAllowance = await getAllowance(
    smartAccountAddress,
    tokenAddress,
    tokenSymbol
  );
  
  if (currentAllowance < fromAmount) {
    console.log(`\n❌ Allowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(fromAmount)}`);
    
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
    console.log(`\n✅ Token allowance sufficient. Current: ${formatEther(currentAllowance)} ${tokenSymbol}`);
  }
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
  console.log(`\n🔍 Checking allowance for ${symbol} to Permit2 contract...`);
  
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

/**
 * Logs information about the swap
 * @param swap - The swap quote data
 * @param fromToken - The token being sent
 * @param toToken - The token being received
 */
function logSwapInfo(
  swap: any,
  fromToken: typeof TOKENS.WETH,
  toToken: typeof TOKENS.USDC
): void {
  console.log("\n📊 Swap Quote Details:");
  console.log("======================");
  
  const fromAmountFormatted = formatUnits(BigInt(swap.fromAmount), fromToken.decimals);
  const toAmountFormatted = formatUnits(BigInt(swap.toAmount), toToken.decimals);
  const minToAmountFormatted = formatUnits(BigInt(swap.minToAmount), toToken.decimals);
  
  console.log(`📤 Sending: ${fromAmountFormatted} ${fromToken.symbol}`);
  console.log(`📥 Receiving: ${toAmountFormatted} ${toToken.symbol}`);
  console.log(`🔒 Minimum Receive: ${minToAmountFormatted} ${toToken.symbol}`);
  
  // Calculate exchange rate
  const exchangeRate = Number(swap.toAmount) / Number(swap.fromAmount) * 
                      Math.pow(10, fromToken.decimals - toToken.decimals);
  console.log(`💱 Exchange Rate: 1 ${fromToken.symbol} = ${exchangeRate.toFixed(2)} ${toToken.symbol}`);
  
  // Calculate slippage
  const slippagePercent = ((Number(swap.toAmount) - Number(swap.minToAmount)) / 
                          Number(swap.toAmount) * 100);
  console.log(`📉 Max Slippage: ${slippagePercent.toFixed(2)}%`);
  
  // Gas information
  if (swap.transaction?.gas) {
    console.log(`⛽ Estimated Gas: ${BigInt(swap.transaction.gas).toLocaleString()}`);
  }
}

/**
 * Validates the swap for any issues
 * @param swap - The swap quote data
 * @returns true if swap is valid, false if there are issues
 */
function validateSwap(swap: any): boolean {
  console.log("\n🔍 Validation Results:");
  console.log("======================");
  
  let isValid = true;
  
  // Check liquidity
  if (!swap.liquidityAvailable) {
    console.log("❌ Insufficient liquidity available");
    isValid = false;
  } else {
    console.log("✅ Liquidity available");
  }
  
  // Check balance issues
  if (swap.issues?.balance) {
    console.log("❌ Balance Issues:");
    console.log(`   Current: ${swap.issues.balance.currentBalance}`);
    console.log(`   Required: ${swap.issues.balance.requiredBalance}`);
    console.log(`   Token: ${swap.issues.balance.token}`);
    isValid = false;
  } else {
    console.log("✅ Sufficient balance");
  }
  
  // Check allowance issues
  if (swap.issues?.allowance) {
    console.log("❌ Allowance Issues:");
    console.log(`   Current: ${swap.issues.allowance.currentAllowance}`);
    console.log(`   Required: ${swap.issues.allowance.requiredAllowance}`);
    console.log(`   Spender: ${swap.issues.allowance.spender}`);
    isValid = false;
  } else {
    console.log("✅ Sufficient allowance");
  }
  
  // Check simulation
  if (swap.issues?.simulationIncomplete) {
    console.log("⚠️ WARNING: Simulation incomplete - transaction may fail");
    // Not marking as invalid since this is just a warning
  } else {
    console.log("✅ Simulation complete");
  }
  
  return isValid;
}

// Add note about dependencies and configuration
console.log("\n📦 Dependencies required:");
console.log("   pnpm add permissionless viem@^2.0.0");
console.log("\n🔧 Environment variables needed:");
console.log("   - BUNDLER_URL: Your bundler service endpoint (required)");
console.log("   - PAYMASTER_URL: Your paymaster service endpoint (optional)");
console.log("   - VIEM_PRIVATE_KEY: Private key for the smart account owner (required)");
console.log("\n💡 Bundler providers: Pimlico, Stackup, Alchemy Account Abstraction");

main().catch(console.error); 