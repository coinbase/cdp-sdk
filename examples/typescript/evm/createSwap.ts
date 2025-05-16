// Usage: pnpm tsx evm/createSwap.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { formatUnits, parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient();

// Token definitions for the example
const TOKENS = {
  WETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    decimals: 18,
  },
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    decimals: 6,
  },
};

async function main() {
  // Get or create an account to use for the swap
  const account = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
  console.log(`Using account: ${account.address}`);

  try {
    // Define the tokens we're working with
    const sellToken = TOKENS.WETH;
    const buyToken = TOKENS.USDC;
    
    // Create a swap transaction from WETH to USDC on Ethereum mainnet
    const swap = await cdp.evm.createSwap({
      network: "ethereum",
      buyToken: buyToken.address,
      sellToken: sellToken.address,
      sellAmount: parseEther("0.1"), // 0.1 WETH in wei
      taker: account.address,
      slippageBps: 100, // 1% slippage tolerance
    });

    // Check for liquidity
    if (!swap.liquidityAvailable) {
      console.log("Insufficient liquidity available for this swap.");
      return;
    }

    // At this point we know liquidityAvailable is true and we can access all properties
    console.log("Swap Transaction Created:");
    console.log("-------------------------");
    console.log(`Buy Amount: ${formatUnits(swap.buyAmount, buyToken.decimals)} ${buyToken.symbol}`);
    console.log(`Min Buy Amount: ${formatUnits(swap.minBuyAmount, buyToken.decimals)} ${buyToken.symbol}`);
    console.log(`Sell Amount: ${formatUnits(swap.sellAmount, sellToken.decimals)} ${sellToken.symbol}`);
    
    // Calculate and display price ratios
    const sellAmountBigInt = BigInt(swap.sellAmount);
    const buyAmountBigInt = BigInt(swap.buyAmount);
    const minBuyAmountBigInt = BigInt(swap.minBuyAmount);
    
    // Calculate price: How many buyTokens per sellToken (e.g., USDC per WETH)
    const sellTokenPrice = Number(
      (buyAmountBigInt * BigInt(10 ** (18 - buyToken.decimals))) / 
      (sellAmountBigInt * BigInt(10 ** (18 - sellToken.decimals)))
    ) / (10 ** 18);
    
    // Calculate the minimum price with slippage applied
    const minSellTokenPrice = Number(
      (minBuyAmountBigInt * BigInt(10 ** (18 - buyToken.decimals))) / 
      (sellAmountBigInt * BigInt(10 ** (18 - sellToken.decimals)))
    ) / (10 ** 18);
    
    // Calculate inverse price: How many sellTokens per buyToken (e.g., WETH per USDC)
    const buyTokenPrice = Number(
      (sellAmountBigInt * BigInt(10 ** (18 - sellToken.decimals))) / 
      (buyAmountBigInt * BigInt(10 ** (18 - buyToken.decimals)))
    ) / (10 ** 18);
    
    console.log("\nToken Price Calculations:");
    console.log("------------------------");
    console.log(`1 ${sellToken.symbol} = ${sellTokenPrice.toLocaleString()} ${buyToken.symbol}`);
    console.log(`1 ${buyToken.symbol} = ${buyTokenPrice.toLocaleString()} ${sellToken.symbol}`);
    
    // Show price with slippage applied
    console.log("\nWith Slippage Applied (Worst Case):");
    console.log("----------------------------------");
    console.log(`1 ${sellToken.symbol} = ${minSellTokenPrice.toLocaleString()} ${buyToken.symbol} (minimum)`);
    console.log(`Slippage: ${swap.slippageBps / 100}%`);
    console.log(`Price impact: ${((sellTokenPrice - minSellTokenPrice) / sellTokenPrice * 100).toFixed(2)}%`);
    
    console.log("\nTransaction Details:");
    console.log(`To: ${swap.transaction.to}`);
    console.log(`Gas: ${swap.transaction.gas}`);
    console.log(`Gas Price: ${swap.transaction.gasPrice}`);
    
    // Check for any issues
    if (swap.issues.allowance) {
      console.log("\nAllowance Issues:");
      console.log(`Current Allowance: ${swap.issues.allowance.currentAllowance}`);
      console.log(`Spender: ${swap.issues.allowance.spender}`);
    }
    
    if (swap.issues.balance) {
      console.log("\nBalance Issues:");
      console.log(`Current Balance: ${swap.issues.balance.currentBalance}`);
      console.log(`Required Balance: ${swap.issues.balance.requiredBalance}`);
      console.log(`Token: ${swap.issues.balance.token}`);
    }

    if (swap.issues.simulationIncomplete) {
      console.log("\n⚠️ WARNING: Simulation incomplete. Transaction may fail.");
    }
    
  } catch (error) {
    console.error("Error creating swap:", error);
  }
}

main().catch(console.error);