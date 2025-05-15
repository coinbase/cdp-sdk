// Usage: pnpm tsx evm/createSwap.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient();

async function main() {
  // Get or create an account to use for the swap
  const account = await cdp.evm.getOrCreateAccount({ name: "SwapAccount" });
  console.log(`Using account: ${account.address}`);

  try {
    // Create a swap transaction from WETH to USDC on Ethereum mainnet
    const swap = await cdp.evm.createSwap({
      network: "ethereum",
      buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      sellAmount: parseEther("0.1").toString(), // 0.1 WETH in wei
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
    console.log(`Buy Amount: ${swap.buyAmount}`);
    console.log(`Min Buy Amount: ${swap.minBuyAmount}`);
    console.log(`Sell Amount: ${swap.sellAmount}`);
    
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