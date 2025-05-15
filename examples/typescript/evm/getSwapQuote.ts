// Usage: pnpm tsx evm/getSwapQuote.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient();

async function main() {
  // Get or create an account to use for the swap
  const account = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
  console.log(`Using account: ${account.address}`);

  try {
    // Get a quote for swapping WETH to USDC on Ethereum mainnet
    const swapQuote = await cdp.evm.getSwapQuote({
      network: "ethereum",
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      sellAmount: parseEther("0.1").toString(), // 0.1 WETH in wei
      taker: account.address,
    });

    // Check for liquidity
    if (!swapQuote.liquidityAvailable) {
      console.log("Insufficient liquidity available for this swap.");
      return;
    }

    // At this point we know liquidityAvailable is true and we can access other properties
    console.log("Swap Quote:");
    console.log("-------------");
    console.log(`Buy Amount: ${swapQuote.buyAmount}`);
    console.log(`Min Buy Amount: ${swapQuote.minBuyAmount}`);
    console.log(`Sell Amount: ${swapQuote.sellAmount}`);
    console.log(`Gas Estimate: ${swapQuote.gas}`);
    
    // Check for any issues
    if (swapQuote.issues.allowance) {
      console.log("\nAllowance Issues:");
      console.log(`Current Allowance: ${swapQuote.issues.allowance.currentAllowance}`);
      console.log(`Spender: ${swapQuote.issues.allowance.spender}`);
    }
    
    if (swapQuote.issues.balance) {
      console.log("\nBalance Issues:");
      console.log(`Current Balance: ${swapQuote.issues.balance.currentBalance}`);
      console.log(`Required Balance: ${swapQuote.issues.balance.requiredBalance}`);
    }

    if (swapQuote.issues.simulationIncomplete) {
      console.log("\n⚠️ WARNING: Simulation incomplete. Results may not be accurate.");
    }
  } catch (error) {
    console.error("Error getting swap quote:", error);
  }
}

main().catch(console.error); 