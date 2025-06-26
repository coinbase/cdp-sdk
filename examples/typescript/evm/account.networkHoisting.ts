// This file demonstrates the type-safe network scoping feature
// It's for demonstration purposes only and won't run without proper setup

import { CdpClient } from "@coinbase/cdp-sdk";

async function demonstrateNetworkScoping() {
  const cdp = new CdpClient();
  const account = await cdp.evm.createAccount();

  // Network: base-sepolia
  // Supports: listTokenBalances ✅, requestFaucet ✅
  const baseSepoliaAccount = await account.useNetwork("base-sepolia");

  // TypeScript knows these are available
  await baseSepoliaAccount.listTokenBalances({});
  await baseSepoliaAccount.requestFaucet({ token: "eth" });
  await baseSepoliaAccount.sendTransaction({ transaction: {} as any });

  // Network: base
  // Supports: listTokenBalances ✅, requestFaucet ❌
  const baseAccount = await account.useNetwork("base");

  // TypeScript knows this is available
  await baseAccount.listTokenBalances({});
  await baseAccount.sendTransaction({ transaction: {} as any });

  // TypeScript would error on this (if types are working correctly):
  // await baseAccount.requestFaucet({ token: "eth" }); // ❌ TypeScript error

  // Network: ethereum
  // Supports: listTokenBalances ✅, requestFaucet ❌
  const ethereumAccount = await account.useNetwork("ethereum");

  // TypeScript knows this is available
  await ethereumAccount.listTokenBalances({});

  // TypeScript would error on this:
  // await ethereumAccount.requestFaucet({ token: "eth" }); // ❌ TypeScript error

  // Network: ethereum-sepolia
  // Supports: listTokenBalances ❌, requestFaucet ✅
  const ethereumSepoliaAccount = await account.useNetwork("ethereum-sepolia");

  // TypeScript knows this is available
  await ethereumSepoliaAccount.requestFaucet({ token: "eth" });

  // TypeScript would error on this:
  // await ethereumSepoliaAccount.listTokenBalances({}); // ❌ TypeScript error

  // Network: polygon
  // Supports: listTokenBalances ❌, requestFaucet ❌
  const polygonAccount = await account.useNetwork("polygon");

  // Only base methods are available
  await polygonAccount.sendTransaction({ transaction: {} as any });
  await polygonAccount.waitForTransactionReceipt({ transactionHash: "0x..." });

  // TypeScript would error on these:
  // await polygonAccount.listTokenBalances({}); // ❌ TypeScript error
  // await polygonAccount.requestFaucet({ token: "eth" }); // ❌ TypeScript error

  // ============================================================================
  // BRING YOUR OWN NODE (BYON) - Custom RPC URLs
  // ============================================================================

  // When using a custom RPC URL, TypeScript can't automatically know which network
  // it is, so only the base methods are available by default
  const customRpcAccount = await account.useNetwork("https://mainnet.base.org");

  // Only these base methods are available:
  await customRpcAccount.sendTransaction({ transaction: {} as any });
  await customRpcAccount.waitForTransactionReceipt({
    transactionHash: "0x...",
  });
  await customRpcAccount.sign({ hash: "0x..." as any });
  await customRpcAccount.signMessage({ message: "Hello" });

  // TypeScript would error on network-specific methods:
  // await customRpcAccount.listTokenBalances({}); // ❌ TypeScript error
  // await customRpcAccount.requestFaucet({ token: "eth" }); // ❌ TypeScript error
  // await customRpcAccount.quoteFund({ token: "usdc", amount: 100n }); // ❌ TypeScript error

  // ============================================================================
  // PROVIDING TYPE INFORMATION FOR CUSTOM RPC URLs
  // ============================================================================

  // If you know which network your custom RPC URL points to, you can provide
  // type information to get compile-time type safety.
  //
  // Note: Due to TypeScript's type inference, you need to cast the RPC URL
  // to the network type when providing a type parameter. This is a known
  // limitation that ensures type safety.

  // Example 1: Custom Base mainnet RPC
  const typedBaseAccount = await account.useNetwork<"base">(
    "https://mainnet.base.org" as "base"
  );

  // Now TypeScript knows this is a base network, so these methods are available:
  await typedBaseAccount.listTokenBalances({});
  await typedBaseAccount.quoteFund({
    network: "base",
    token: "usdc",
    amount: 100n,
  });
  await typedBaseAccount.fund({ network: "base", token: "usdc", amount: 100n });
  await typedBaseAccount.quoteSwap({
    network: "base",
    fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as any, // USDC
    toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as any, // WETH
    fromAmount: 100n,
  });
  await typedBaseAccount.swap({ swapQuote: {} as any });

  // But requestFaucet is not available on base mainnet:
  // await typedBaseAccount.requestFaucet({ token: "eth" }); // ❌ TypeScript error

  // Example 2: Custom Base Sepolia RPC
  const typedSepoliaAccount = await account.useNetwork<"base-sepolia">(
    "https://sepolia.base.org" as "base-sepolia"
  );

  // Now TypeScript knows this is base-sepolia, so these methods are available:
  await typedSepoliaAccount.listTokenBalances({});
  await typedSepoliaAccount.requestFaucet({ token: "eth" });
  await typedSepoliaAccount.transfer({
    network: "base-sepolia",
    to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8" as any,
    amount: 100n,
    token: "eth",
  });

  // But fund/swap methods are not available on testnets:
  // await typedSepoliaAccount.quoteFund({ network: "base", token: "usdc", amount: 100n }); // ❌ TypeScript error
  // await typedSepoliaAccount.swap({ swapQuote: {} as any }); // ❌ TypeScript error

  // Example 3: Custom Ethereum mainnet RPC
  const typedEthereumAccount = await account.useNetwork<"ethereum">(
    "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY" as "ethereum"
  );

  // Ethereum mainnet supports listTokenBalances and swap methods:
  await typedEthereumAccount.listTokenBalances({});
  await typedEthereumAccount.quoteSwap({
    network: "ethereum",
    fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as any, // WETH
    toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as any, // USDC
    fromAmount: 100n,
  });
  await typedEthereumAccount.swap({ swapQuote: {} as any });

  // But not requestFaucet or fund:
  // await typedEthereumAccount.requestFaucet({ token: "eth" }); // ❌ TypeScript error
  // await typedEthereumAccount.fund({ network: "base", token: "usdc", amount: 100n }); // ❌ TypeScript error

  // ============================================================================
  // IMPORTANT NOTE ABOUT TYPE PARAMETERS WITH CUSTOM RPC URLs
  // ============================================================================

  // When using custom RPC URLs with type parameters, the type parameter tells
  // TypeScript which network methods to expose, but it's YOUR responsibility
  // to ensure the RPC URL actually points to that network!

  // For example, this would compile but fail at runtime if the RPC doesn't point to base:
  // const wrongNetwork = await account.useNetwork<"base">("https://eth-mainnet.alchemy.com" as "base");
  // await wrongNetwork.fund({ network: "base", token: "usdc", amount: 100n }); // Runtime error!
}

// Note: This example is for demonstration purposes.
// In practice, the TypeScript compiler will enforce these constraints at compile time.
