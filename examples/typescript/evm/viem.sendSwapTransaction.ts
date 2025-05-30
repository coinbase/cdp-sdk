// Usage: pnpm tsx evm/viem.sendSwapTransaction.ts

/**
 * This example demonstrates how to perform token swaps using a viem wallet
 * instead of a CDP-managed wallet. Key differences from the CDP wallet approach:
 * 
 * 1. Uses a viem wallet created from a private key (VIEM_WALLET_PRIVATE_KEY env var)
 * 2. Still uses CDP API for creating swap quotes (cdp.evm.createSwapQuote)
 * 3. Uses viem's walletClient.sendTransaction instead of CDP's account.swap()
 * 4. Manually handles Permit2 signatures if needed (CDP wallet handles this automatically)
 * 5. Uses viem for token approval transactions instead of CDP's sendTransaction
 * 
 * This approach gives you more control over transaction execution while still
 * benefiting from CDP's swap routing and pricing engine.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseUnits, 
  createPublicClient, 
  createWalletClient,
  http, 
  erc20Abi,
  formatEther,
  PrivateKeyAccount,
  concat,
  numberToHex,
  size
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import "dotenv/config";

// Network configuration
const NETWORK = "base"; // Base mainnet

// Create viem clients for transaction management
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
  console.log(`Note: This example is using ${NETWORK} network with a viem wallet.`);
  
  // Get the private key from environment variable
  const privateKey = process.env.VIEM_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Please set VIEM_WALLET_PRIVATE_KEY in your .env file");
  }
  
  // Create a viem account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`\nUsing viem wallet: ${account.address}`);
  
  // Check ETH balance
  const balance = await publicClient.getBalance({
    address: account.address,
  });
  console.log(`ETH Balance: ${formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    console.log("\n⚠️  Warning: Your wallet has no ETH. You'll need ETH for gas fees.");
    return;
  }

  try {
    // Define the tokens we're working with
    const sellToken = TOKENS.WETH;
    const buyToken = TOKENS.USDC;
    
    // Set the amount we want to sell
    const sellAmount = parseUnits("0.1", sellToken.decimals); // 0.1 WETH
    
    console.log(`\nInitiating swap of ${formatEther(sellAmount)} ${sellToken.symbol} for ${buyToken.symbol}`);

    // Handle token allowance check and approval if needed (applicable when selling non-native assets only)
    if (!sellToken.isNativeAsset) {
      await handleTokenAllowance(
        account,
        sellToken.address as `0x${string}`,
        sellToken.symbol,
        sellAmount
      );
    }
    
    // Create the swap quote transaction using CDP API
    console.log("\nCreating swap quote using CDP API...");
    const swapResponse = await cdp.evm.createSwapQuote({
      network: NETWORK,
      buyToken: buyToken.address as `0x${string}`,
      sellToken: sellToken.address as `0x${string}`,
      sellAmount,
      taker: account.address,
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
    
    // Submit the swap transaction using viem
    console.log("\nSubmitting the swap transaction using viem wallet...");
    
    // Prepare transaction data
    let txData = swap.transaction.data as `0x${string}`;
    
    // Handle Permit2 signature if needed
    if (swap.permit2?.eip712) {
      console.log("Signing Permit2 message...");
      
      // Sign the Permit2 typed data message
      // Note: CDP SDK's account.swap() handles this automatically,
      // but with viem we need to sign it manually
      const signature = await account.signTypedData({
        domain: swap.permit2.eip712.domain,
        types: swap.permit2.eip712.types,
        primaryType: swap.permit2.eip712.primaryType,
        message: swap.permit2.eip712.message,
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
      to: swap.transaction.to as `0x${string}`,
      data: txData,
      value: BigInt(swap.transaction.value || 0),
      gas: BigInt(swap.transaction.gas),
      gasPrice: BigInt(swap.transaction.gasPrice),
    });

    console.log(`Transaction hash: ${hash}`);
    console.log(`Waiting for confirmation...`);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    console.log("\nSwap Transaction Confirmed!");
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
    console.log(`Status: ${receipt.status === 'success' ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`Transaction Explorer: https://basescan.org/tx/${hash}`);
    
  } catch (error) {
    console.error("Error executing swap:", error);
  }
}

/**
 * Handles token allowance check and approval if needed
 * @param account - The viem account
 * @param tokenAddress - The address of the token to be sold
 * @param tokenSymbol - The symbol of the token (e.g., WETH, USDC)
 * @param sellAmount - The amount to be sold
 * @returns A promise that resolves when allowance is sufficient
 */
async function handleTokenAllowance(
  account: PrivateKeyAccount,
  tokenAddress: `0x${string}`,
  tokenSymbol: string,
  sellAmount: bigint
): Promise<void> {
  // Check allowance before attempting the swap
  const currentAllowance = await getAllowance(
    account.address, 
    tokenAddress,
    tokenSymbol
  );
  
  // If allowance is insufficient, approve tokens
  if (currentAllowance < sellAmount) {
    console.log(`\nAllowance insufficient. Current: ${formatEther(currentAllowance)}, Required: ${formatEther(sellAmount)}`);
    
    // Set the allowance to the required amount
    await approveTokenAllowance(
      account,
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
  account: PrivateKeyAccount,
  tokenAddress: `0x${string}`, 
  spenderAddress: `0x${string}`, 
  amount: bigint
) {
  console.log(`\nApproving token allowance for ${tokenAddress} to spender ${spenderAddress}`);
  
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
    console.log("\nInsufficient balance. Please add funds to your wallet.");
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