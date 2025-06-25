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
}

// Note: This example is for demonstration purposes.
// In practice, the TypeScript compiler will enforce these constraints at compile time.
