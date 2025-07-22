// This file demonstrates the type-safe network scoping feature for smart accounts
// It's for demonstration purposes only and won't run without proper setup

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

/**
 * Network-Hoisting for Smart Accounts
 *
 * Smart accounts now support network-scoped operations through the `useNetwork` method.
 * This provides type-safe access to network-specific methods at compile time.
 *
 * USAGE:
 * ```typescript
 * const smartAccount = await cdp.evm.createSmartAccount();
 * const networkScopedAccount = await smartAccount.useNetwork("base");
 * ```
 */

const cdp = new CdpClient();

// Create an owner account and smart account
const owner = await cdp.evm.getOrCreateAccount({
  name: "Network-Hoisting-Demo-Owner",
});

const smartAccount = await cdp.evm.getOrCreateSmartAccount({
  name: "Network-Hoisting-Demo-Smart-Account",
  owner,
});

// ============================================================================
// Example 1: Base Network
// Supports: transfer, listTokenBalances, quoteFund, fund, quoteSwap, swap
// Will automatically use the paymaster URL from Coinbase Developer Platform
// If you want to use a different paymaster, you can pass it in as an option
// ============================================================================

const baseAccount = await smartAccount.useNetwork("base");

// ✅ These methods are available on base:
await baseAccount.sendUserOperation({
  calls: [
    {
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
      value: 100n,
      data: "0x",
    },
  ],
});

await baseAccount.sendUserOperation({
  calls: [
    {
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
      value: 100n,
      data: "0x",
    },
  ],
  paymasterUrl: "https://your-paymster.com",
});

await baseAccount.transfer({
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  amount: 100n,
  token: "eth",
});

await baseAccount.listTokenBalances({});

const fundQuote = await baseAccount.quoteFund({
  token: "usdc",
  amount: 100n,
});

const fundResult = await baseAccount.fund({
  token: "usdc",
  amount: 100n,
});

await baseAccount.waitForFundOperationReceipt({
  transferId: fundResult.id,
});

const swapQuote = await baseAccount.quoteSwap({
  fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  fromAmount: 100n,
});

// ❌ NOT available on base mainnet:
// await baseAccount.requestFaucet({ token: "eth" }); // ❌ TypeScript error - Only available on testnets

// ============================================================================
// Example 2: Base Sepolia (Testnet)
// Supports: transfer, listTokenBalances, requestFaucet
// Does NOT support: quoteFund, fund, quoteSwap, swap
// ============================================================================

const baseSepoliaAccount = await smartAccount.useNetwork("base-sepolia");

// ✅ These methods are available on base-sepolia:
await baseSepoliaAccount.sendUserOperation({
  calls: [
    {
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
      value: 100n,
      data: "0x",
    },
  ],
});

await baseSepoliaAccount.transfer({
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  amount: 100n,
  token: "eth",
});

await baseSepoliaAccount.requestFaucet({
  token: "eth",
}); // Available on testnets!

await baseSepoliaAccount.listTokenBalances({});

// ❌ NOT available on base-sepolia:
// await baseSepoliaAccount.quoteFund({ ... }); // ❌ TypeScript error - Not supported on testnets
// await baseSepoliaAccount.fund({ ... });      // ❌ TypeScript error - Not supported on testnets
// await baseSepoliaAccount.quoteSwap({ ... }); // ❌ TypeScript error - Not supported on testnets
// await baseSepoliaAccount.swap({ ... });      // ❌ TypeScript error - Not supported on testnets

// ============================================================================
// Example 3: Ethereum Network
// Supports: listTokenBalances, quoteSwap, swap
// Does NOT support: transfer, requestFaucet, quoteFund, fund
// ============================================================================

const ethereumAccount = await smartAccount.useNetwork("ethereum");

// ✅ Available on ethereum:
await ethereumAccount.sendUserOperation({
  calls: [
    {
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
      value: 100n,
      data: "0x",
    },
  ],
});

// ✅ Available on ethereum:
await ethereumAccount.transfer({
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  amount: 100n,
  token: "eth",
});

await ethereumAccount.listTokenBalances({});

const ethSwapQuote = await ethereumAccount.quoteSwap({
  fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  fromAmount: 100n,
});

// ❌ NOT available on ethereum:
// await ethereumAccount.fund({ ... });          // ❌ TypeScript error - Only available on Base
// await ethereumAccount.quoteFund({ ... });     // ❌ TypeScript error - Only available on Base
// await ethereumAccount.requestFaucet({ ... }); // ❌ TypeScript error - Only available on testnets

// ============================================================================
// Example 4: Ethereum Sepolia
// Supports: requestFaucet
// Does NOT support: transfer, listTokenBalances, quoteFund, fund, quoteSwap, swap
// ============================================================================

const ethereumSepoliaAccount = await smartAccount.useNetwork(
  "ethereum-sepolia"
);

// ✅ Available on ethereum-sepolia:
await ethereumSepoliaAccount.sendUserOperation({
  calls: [
    {
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
      value: 100n,
      data: "0x",
    },
  ],
});

await ethereumSepoliaAccount.requestFaucet({
  token: "eth",
});

// ❌ NOT available on ethereum-sepolia:
// await ethereumSepoliaAccount.listTokenBalances({ });    // ❌ TypeScript error
// await ethereumSepoliaAccount.quoteFund({ ... });        // ❌ TypeScript error
// await ethereumSepoliaAccount.fund({ ... });             // ❌ TypeScript error
// await ethereumSepoliaAccount.quoteSwap({ ... });        // ❌ TypeScript error
// await ethereumSepoliaAccount.swap({ ... });             // ❌ TypeScript error

// ============================================================================
// Example 5: Polygon and other networks
// Only support base method: sendUserOperation
// (transfer is not supported on non-base networks according to config)
// ============================================================================

const polygonAccount = await smartAccount.useNetwork("polygon");

// ✅ Only sendUserOperation is available:
await polygonAccount.sendUserOperation({
  calls: [
    {
      to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
      value: 100n,
      data: "0x",
    },
  ],
});

// ❌ Network-specific methods not available:
// await polygonAccount.transfer({ ... });        // ❌ TypeScript error - Not supported on polygon
// await polygonAccount.listTokenBalances({ });   // ❌ TypeScript error
// await polygonAccount.requestFaucet({ ... });   // ❌ TypeScript error
// await polygonAccount.quoteFund({ ... });       // ❌ TypeScript error
// await polygonAccount.fund({ ... });            // ❌ TypeScript error
// await polygonAccount.quoteSwap({ ... });       // ❌ TypeScript error
// await polygonAccount.swap({ ... });            // ❌ TypeScript error

// ============================================================================
// Network Support Matrix for Smart Accounts
// ============================================================================
//
// | Network          | sendUserOperation | transfer | listTokenBalances | requestFaucet | quoteFund | fund | quoteSwap | swap |
// |------------------|-------------------|----------|-------------------|---------------|-----------|------|-----------|------|
// | base             | ✅                | ✅       | ✅                | ❌            | ✅        | ✅   | ✅        | ✅   |
// | base-sepolia     | ✅                | ✅       | ✅                | ✅            | ❌        | ❌   | ❌        | ❌   |
// | ethereum         | ✅                | ❌       | ✅                | ❌            | ❌        | ❌   | ✅        | ✅   |
// | ethereum-sepolia | ✅                | ❌       | ❌                | ✅            | ❌        | ❌   | ❌        | ❌   |
// | polygon          | ✅                | ❌       | ❌                | ❌            | ❌        | ❌   | ❌        | ❌   |
// | polygon-mumbai   | ✅                | ❌       | ❌                | ❌            | ❌        | ❌   | ❌        | ❌   |
// | arbitrum         | ✅                | ❌       | ❌                | ❌            | ❌        | ❌   | ❌        | ❌   |
// | arbitrum-sepolia | ✅                | ❌       | ❌                | ❌            | ❌        | ❌   | ❌        | ❌   |
// | optimism         | ✅                | ❌       | ❌                | ❌            | ❌        | ❌   | ❌        | ❌   |
// | optimism-sepolia | ✅                | ❌       | ❌                | ❌            | ❌        | ❌   | ❌        | ❌   |

// ============================================================================
// Benefits of Network-Scoped Smart Accounts:
// ============================================================================
//
// 1. Type Safety: TypeScript prevents calling methods that aren't supported on a network
// 2. Better DevX: IntelliSense only shows available methods
// 3. Runtime Safety: Methods are only added if the network supports them
// 4. Clean API: No need to specify network in every method call (for some methods)
// 5. Simplified Usage: Works with known networks for better type safety

// Note: This example is for demonstration purposes.
// In practice, the TypeScript compiler will enforce these constraints at compile time.
