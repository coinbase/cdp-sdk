// Usage: pnpm tsx evm/swaps/smartAccount.swapWithNetworkHoisting.ts

/**
 * This example demonstrates combining network hoisting with smart account swap functionality.
 * It shows how to use network scoping to connect to different networks and demonstrates
 * swap methods on these networks using smart accounts.
 * 
 * Network Hoisting allows you to create network-specific smart account instances from a base smart account
 * and switch between different networks seamlessly.
 * 
 * This example covers the following swap methods:
 * 1. cdp.evm.getSwapPrice() - Get swap price estimates
 * 2. smartAccount.swap() - All-in-one swap execution with smart account benefits
 * 3. smartAccount.quoteSwap() - Create quote, inspect, then execute
 * 
 * Networks Demonstrated:
 * - Optimism (optimism)
 * - Arbitrum (arbitrum)
 */
import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseUnits,
  createPublicClient,
  http,
  erc20Abi,
  encodeFunctionData,
  formatEther,
  type Address,
} from "viem";
import "dotenv/config";

// Network configuration
const NETWORK: "optimism" | "arbitrum" = "optimism";  // "optimism" or "arbitrum" for this example

// Token definitions for different networks
const TOKENS = {
    optimism: {
        WETH: {
            address: "0x4200000000000000000000000000000000000006",
            symbol: "WETH",
            decimals: 18,
            isNativeAsset: false,
        },
        USDC: {
            address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
            symbol: "USDC", 
            decimals: 6,
            isNativeAsset: false,
        },
        OP: {
            address: "0x4200000000000000000000000000000000000042",
            symbol: "OP",
            decimals: 18,
            isNativeAsset: false,
        },
        DAI: {
            address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            symbol: "DAI",
            decimals: 18,
            isNativeAsset: false,
        }
    },
    arbitrum: {
        WETH: {
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            symbol: "WETH",
            decimals: 18,
            isNativeAsset: false,
        },
        USDC: {
            address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            symbol: "USDC",
            decimals: 6,
            isNativeAsset: false,
        },
        ARB: {
            address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
            symbol: "ARB", 
            decimals: 18,
            isNativeAsset: false,
        },
        DAI: {
            address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            symbol: "DAI",
            decimals: 18,
            isNativeAsset: false,
        }
    },
    base: {
        WETH: {
            address: "0x4200000000000000000000000000000000000006",
            symbol: "WETH",
            decimals: 18,
            isNativeAsset: false,
        },
        USDC: {
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            symbol: "USDC",
            decimals: 6,
            isNativeAsset: false,
        },
        BRETT: {
            address: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
            symbol: "BRETT",
            decimals: 18,
            isNativeAsset: false,
        }
    }
};

// Permit2 contract address is the same across all networks
const PERMIT2_ADDRESS: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// Network RPC URLs for public clients
const NETWORK_RPC_URLS = {
  optimism: "https://mainnet.optimism.io",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  base: "https://mainnet.base.org",
};

// Create viem public clients for different networks
const publicClients = {
  optimism: createPublicClient({
    transport: http(NETWORK_RPC_URLS.optimism),
  }),
  arbitrum: createPublicClient({
    transport: http(NETWORK_RPC_URLS.arbitrum),
  }),
  base: createPublicClient({
    transport: http(NETWORK_RPC_URLS.base),
  }),
};

// Create a CDP client
const cdp = new CdpClient();

async function main() {
    
console.log(`Note: This example is using ${NETWORK} network with smart accounts. Make sure you have funds available.`);
  
  // Create an owner account for the smart account
  const ownerAccount = await cdp.evm.getOrCreateAccount({ 
    name: "NetworkHoistingOwner" 
  });
  console.log(`Owner account: ${ownerAccount.address}`);

  // Create a smart account
  const baseSmartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: "NetworkHoistingSmartAccount",
    owner: ownerAccount
  });
  console.log(`Smart account: ${baseSmartAccount.address}`);

  // Use network hoisting to create a network-scoped smart account
  console.log(`\nCreating network-scoped smart account for ${NETWORK}...`);
  const networkSmartAccount = await baseSmartAccount.useNetwork(NETWORK);
  console.log(`${NETWORK} smart account created: ${networkSmartAccount.address}`);

  // Example: swap DAI to USDC
  const fromToken = TOKENS[NETWORK].DAI;
  const toToken = TOKENS[NETWORK].USDC;
  const swapAmount = parseUnits("0.01", fromToken.decimals); 
  console.log(`\n💱 Example: swap DAI to USDC...`);
  console.log(`Swap: ${formatUnits(swapAmount, fromToken.decimals)} ${fromToken.symbol} → ${toToken.symbol}`);
  
  // Handle token allowance check and approval if needed (applicable when sending non-native assets only)
  if (!fromToken.isNativeAsset) {
    await handleTokenAllowance(
      networkSmartAccount,
      fromToken.address as Address,
      fromToken.symbol,
      swapAmount * BigInt(2) // since this example performs the swap twice consecutively
    );
  }
  
  // Example 1. getSwapPrice()
  // This demonstrates the price estimation (same for smart accounts and regular accounts).
  console.log(`\nExample 1: Getting swap price estimate...`);
  try {
    const priceQuote = await cdp.evm.getSwapPrice({
      network: NETWORK,
      fromToken: fromToken.address as Address,
      toToken: toToken.address as Address,
      fromAmount: swapAmount,
      taker: networkSmartAccount.address as Address,
    });
    
    if (priceQuote.liquidityAvailable) {
      const fromAmountFormatted = formatUnits(BigInt(priceQuote.fromAmount), fromToken.decimals);
      const toAmountFormatted = formatUnits(BigInt(priceQuote.toAmount), toToken.decimals);
      
      console.log(`Price available on ${NETWORK}:`);
      console.log(`Send: ${fromAmountFormatted} ${fromToken.symbol}`);
      console.log(`Receive: ${toAmountFormatted} ${toToken.symbol}`);
      console.log(`Exchange Rate: 1 ${fromToken.symbol} = ${(parseFloat(toAmountFormatted) / parseFloat(fromAmountFormatted)).toFixed(6)} ${toToken.symbol}`);
    } else {
      console.log(`No liquidity available for this pair on ${NETWORK}`);
    }
  } catch (error) {
    console.log(`Failed to get swap price on ${NETWORK}: ${error}`);
  }

  // Example 2. smartAccount.swap()
  // This demonstrates the all-in-one smart account swap execution with benefits.
  console.log(`\nExample 2: Executing all-in-one smart account swap...`);
  console.log('Please uncomment the code below to execute the swap.');
   
   // Uncomment below to execute actual smart account swap (requires sufficient balance and allowances)
   /*
   try {
     const result = await networkSmartAccount.swap({
       fromToken: fromToken.address as Address,
       toToken: toToken.address as Address,
       fromAmount: swapAmount,
       slippageBps: 100, // 1% slippage tolerance (100 basis points)
     });
     
     console.log(`Smart account swap executed successfully on ${NETWORK}:`);
     console.log(`User Operation Hash: ${result.userOpHash}`);
     console.log(`Waiting for confirmation...`);
       
     // Wait for user operation completion
    const receipt = await networkSmartAccount.waitForUserOperation({
      userOpHash: result.userOpHash as `0x${string}`,
    });
       
    console.log("\nSmart Account Swap Confirmed!");
    console.log(`Status: ${receipt.status === 'complete' ? 'Complete ✅' : 'Failed ❌'}`);
     if (NETWORK === 'optimism') {
       console.log(`Transaction Explorer: https://explorer.optimism.io/tx/${result.userOpHash}`);
     } else if (NETWORK === 'arbitrum') {
       console.log(`Transaction Explorer: https://arbiscan.io/tx/${result.userOpHash}`);
     }
   } catch (error) {
     console.log(`Failed to swap with smart account on ${NETWORK}: ${error}`);
   }
   */

   // Example 3. smartAccount.quoteSwap() + execute
   // This demonstrates the quote-then-execute pattern for smart accounts with more control.
   console.log(`\nExample 3: Quote-then-execute pattern...`);
   try {
     // 1. Create the quote
     console.log(`\nStep 1: Creating smart account swap quote...`);
     const swapQuote = await networkSmartAccount.quoteSwap({
       fromToken: fromToken.address as Address,
       toToken: toToken.address as Address,
       fromAmount: swapAmount,
       slippageBps: 100, // 1% slippage tolerance (100 basis points)
     });
     
     if (!swapQuote.liquidityAvailable) {
       console.log(`No liquidity available for this pair on ${NETWORK}`);
       return;
     }
     
     // 2. Inspect the quote details
     console.log(`\nStep 2: Inspecting smart account quote details...`);
     displaySwapQuoteDetails(swapQuote, fromToken, toToken);
     
     // 3. Validate the swap quote
     console.log(`\nStep 3: Validating smart account swap quote...`);
     const isValid = validateSwapQuote(swapQuote);
     
     if (!isValid) {
       console.log(`❌ Smart account swap quote validation failed. Please check the issues above.`);
       return;
     }
     
     // 4. Execute (commented out for demo)
     console.log(`\nStep 4: Execute smart account swap (DEMO ONLY)`);
     console.log('Please uncomment the code below to execute the swap.');
     
     // Uncomment to actually execute:
     /*
    console.log(`✅ Conditions met, executing smart account swap...`);
    const result = await swapQuote.execute();
    console.log(`User Operation Hash: ${result.userOpHash}`);
    console.log(`Waiting for confirmation...`);
       
     // Wait for user operation completion
    const receipt = await networkSmartAccount.waitForUserOperation({
      userOpHash: result.userOpHash as `0x${string}`,
    });
       
    console.log("\nSmart Account Swap Confirmed!");
    console.log(`Status: ${receipt.status === 'complete' ? 'Complete ✅' : 'Failed ❌'}`);
     if (NETWORK === 'optimism') {
       console.log(`Transaction Explorer: https://explorer.optimism.io/tx/${result.userOpHash}`);
     } else if (NETWORK === 'arbitrum') {
       console.log(`Transaction Explorer: https://arbiscan.io/tx/${result.userOpHash}`);
     }   
     */
   } catch (error) {
     console.log(`Smart account quote and execute pattern failed on ${NETWORK}: ${error}`);
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
  fromToken: typeof TOKENS.optimism.DAI | typeof TOKENS.arbitrum.DAI | typeof TOKENS.base.WETH,
  toToken: typeof TOKENS.optimism.USDC | typeof TOKENS.arbitrum.USDC | typeof TOKENS.base.USDC
): void {
  console.log("Smart Account Swap Quote Details:");
  console.log("================================");
  
  const fromAmountFormatted = formatUnits(BigInt(swapQuote.fromAmount), fromToken.decimals);
  const toAmountFormatted = formatUnits(BigInt(swapQuote.toAmount), toToken.decimals);
  const minToAmountFormatted = formatUnits(BigInt(swapQuote.minToAmount), toToken.decimals);
  
  console.log(`📤 Sending: ${fromAmountFormatted} ${fromToken.symbol}`);
  console.log(`📥 Receiving: ${toAmountFormatted} ${toToken.symbol}`);
  console.log(`🔒 Minimum Receive: ${minToAmountFormatted} ${toToken.symbol}`);
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`🔐 Smart Account: Yes (User Operation)`);
  
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
  console.log("Smart Account Validation Results:");
  console.log("================================");
  
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
    console.log("⚠️ WARNING: Simulation incomplete - user operation may fail");
    // Not marking as invalid since this is just a warning
  } else {
    console.log("✅ Simulation complete");
  }
  
  return isValid;
}

/**
 * Handles token allowance check and approval if needed for smart accounts
 * @param smartAccount - The smart account instance
 * @param tokenAddress - The address of the token to be sent
 * @param tokenSymbol - The symbol of the token (e.g., DAI, USDC)
 * @param fromAmount - The amount to be sent
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  smartAccount: any,
  tokenAddress: Address,
  tokenSymbol: string,
  fromAmount: bigint
): Promise<void> {
  console.log(`\n🔐 Checking smart account token allowance for ${tokenSymbol}...`);
  
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
  console.log(`\nApproving smart account token allowance for ${tokenAddress} to spender ${spenderAddress}`);
  
  // Encode the approve function call
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, amount]
  });
  
  // Send the approve user operation (no network parameter needed for network-scoped smart account)
  const userOpResult = await smartAccount.sendUserOperation({
    calls: [{
      to: tokenAddress,
      data,
      value: BigInt(0),
    }],
  });
  
  console.log(`Approval user operation hash: ${userOpResult.userOpHash}`);
  
  // Wait for user operation completion
  const receipt = await smartAccount.waitForUserOperation({
    userOpHash: userOpResult.userOpHash,
  });
  
  console.log(`Approval confirmed with status: ${receipt.status} ✅`);
  return receipt;
}

/**
 * Check token allowance for the Permit2 contract
 * @param owner - The token owner's address (smart account address)
 * @param token - The token contract address
 * @param symbol - The token symbol for logging
 * @returns The current allowance
 */
async function getAllowance(
  owner: Address, 
  token: Address,
  symbol: string
): Promise<bigint> {
  console.log(`Checking allowance for ${symbol} (${token}) to Permit2 contract...`);
  
  try {
    const publicClient = publicClients[NETWORK];
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

// Run the example
main().catch(console.error); 