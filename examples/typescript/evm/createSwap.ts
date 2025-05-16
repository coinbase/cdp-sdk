// Usage: pnpm tsx evm/createSwap.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { 
  formatUnits, 
  parseEther, 
  createPublicClient, 
  http, 
  numberToHex, 
  size, 
  concat, 
  erc20Abi,
  encodeFunctionData,
  formatEther
} from "viem";
import { base, mainnet, sepolia } from "viem/chains";
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
  },
  USDC: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    decimals: 6,
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

    // Handle token allowance check and approval if needed
    await handleTokenAllowance(
      ownerAccount.address as `0x${string}`, 
      sellToken.address as `0x${string}`,
      sellToken.symbol,
      sellAmount
    );
    
    // Create the swap transaction
    const swap = await createSwapTransaction(
      ownerAccount.address as `0x${string}`, 
      sellToken.address as `0x${string}`, 
      buyToken.address as `0x${string}`, 
      sellAmount
    );
    
    // Log swap details
    logSwapInfo(swap, sellToken, buyToken);
    
    // Validate the swap for any issues
    if (!validateSwap(swap)) {
      return;
    }
    
    // Submit the swap transaction
    await submitSwapTransaction(ownerAccount.address, swap);
    
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
 * Creates a swap transaction
 * @param takerAddress - The address that will execute the swap
 * @param sellToken - The token to sell
 * @param buyToken - The token to buy
 * @param sellAmount - The amount of sellToken to swap
 * @returns The swap transaction data
 */
async function createSwapTransaction(
  takerAddress: `0x${string}`,
  sellTokenAddress: `0x${string}`,
  buyTokenAddress: `0x${string}`,
  sellAmount: bigint
): Promise<any> {
  console.log("\nCreating swap quote...");
  
  const swap = await cdp.evm.createSwap({
    network: NETWORK,
    buyToken: buyTokenAddress,
    sellToken: sellTokenAddress,
    sellAmount,
    taker: takerAddress,
    slippageBps: 100, // 1% slippage tolerance
  });
  
  return swap;
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
 * Submits the swap transaction
 * @param ownerAddress - The address that will execute the swap
 * @param swap - The swap transaction data
 * @returns A promise that resolves when the transaction is confirmed
 */
async function submitSwapTransaction(ownerAddress: `0x${string}`, swap: any): Promise<void> {
  const { transaction } = swap;
  
  try {

    // Sign the permit2.eip712 data and append it to the transaction data
    let finalTxData = transaction.data;
    
    if (swap.permit2?.eip712) {
      finalTxData = await handlePermit2Signature(ownerAddress, swap, transaction.data);
    }
    
    console.log("\nSubmitting the swap onchain...");

    // Sign and send the transaction using CDP's sendTransaction
    const txResult = await cdp.evm.sendTransaction({
      address: ownerAddress,
      network: NETWORK,
      transaction: {
        to: transaction.to as `0x${string}`,
        data: finalTxData,
        ...(transaction.value ? { value: BigInt(transaction.value) } : {}),
        ...(transaction.gas ? { gas: BigInt(transaction.gas) } : {}),
      },
    });

    console.log(`Transaction hash: ${txResult.transactionHash}.`);
    console.log(`Waiting for confirmation...`);

    // Wait for transaction confirmation using viem
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txResult.transactionHash,
    });

    console.log("\nSwap Transaction Confirmed!");
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
    console.log(`Status: ${receipt.status === 'success' ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`Transaction Explorer: https://basescan.org/tx/${txResult.transactionHash}`);
      
  } catch (error) {
    console.error("Error executing the transaction:", error);
  }
}

/**
 * Handles the Permit2 EIP-712 signature process
 * @param ownerAddress - The address that will sign the permit
 * @param swap - The swap transaction data
 * @param transactionData - The original transaction data
 * @returns The transaction data with appended signature
 */
async function handlePermit2Signature(
  ownerAddress: `0x${string}`, 
  swap: any, 
  transactionData: `0x${string}`
): Promise<`0x${string}`> {
  console.log("\nPermit2 EIP-712 signature required to submit the swap transaction:");
  console.log("----------------------------------");
  console.log("1. Sign the Permit2 EIP-712 message");
  
  // Sign the Permit2 EIP-712 message using CDP's signTypedData
  const signature = await cdp.evm.signTypedData({
    address: ownerAddress,
    domain: swap.permit2.eip712.domain,
    types: swap.permit2.eip712.types,
    primaryType: swap.permit2.eip712.primaryType,
    message: swap.permit2.eip712.message,
  });

  console.log("Permit2 signature:", signature.signature);
  console.log("Signed the Permit2 message");
  
  console.log("\n2. Append the Permit2 signature to transaction.data");
  
  // Calculate the signature length as a 32-byte hex value
  const signatureLengthInHex = numberToHex(size(signature.signature), {
    signed: false,
    size: 32,
  });
  
  console.log("Transaction signature:", signature.signature);
  
  // Append the signature length and signature to the transaction data
  const finalTxData = concat([
    transactionData,
    signatureLengthInHex,
    signature.signature
  ]);
  
  console.log("Appended the Permit2 EIP-712 signature to the transaction data");
  
  return finalTxData;
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