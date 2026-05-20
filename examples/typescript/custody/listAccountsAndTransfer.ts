// Usage: pnpm tsx custody/listAccountsAndTransfer.ts
//
// Demonstrates the Flexible Custody API flow:
//   1. List accounts
//   2. Get balances for the first account
//   3. Create a quoted transfer (not executed)
//   4. List recent transfers

import {
    configure,
    listFoundationAccounts,
    listBalances,
    createTransfer,
    listTransfers,
  } from "@coinbase/cdp-sdk";
  import "dotenv/config";

  configure({
    apiKeyId: process.env.CDP_API_KEY_ID ?? process.env.CDP_API_KEY_NAME ?? "",
    apiKeySecret: process.env.CDP_API_KEY_SECRET ?? "",
    walletSecret: process.env.CDP_WALLET_SECRET,
  });

  async function main() {
    // 1. List accounts
    const { accounts } = await listFoundationAccounts();
    console.log(`Found ${accounts.length} accounts:`);
    for (const account of accounts) {
      console.log(`  ${account.accountId} (${account.name}) - type: ${account.type}`);
    }

    if (accounts.length === 0) {
      console.log("No accounts found. Create one in the CDP dashboard first.");
      return;
    }

    // 2. Get balances for the first account
    const account = accounts[0];
    const { balances } = await listBalances(account.accountId);
    console.log(`\nBalances for ${account.name}:`);
    for (const balance of balances) {
      console.log(`  ${balance.asset}: ${balance.amount}`);
    }

    // 3. Create a quoted transfer (execute: false — no funds move)
    const transfer = await createTransfer({
      source: {
        accountId: account.accountId,
        asset: "usd",
      },
      target: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        network: "base",
        asset: "usdc",
      },
      amount: "10.00",
      asset: "usd",
      execute: false,
    });
    console.log(`\nCreated transfer ${transfer.transferId}:`);
    console.log(`  Status: ${transfer.status}`);
    console.log(`  Source: ${transfer.sourceAmount} ${transfer.sourceAsset}`);
    console.log(`  Target: ${transfer.targetAmount} ${transfer.targetAsset}`);
    console.log(`  Expires: ${transfer.expiresAt}`);

    // 4. List recent transfers
    const { transfers } = await listTransfers({ status: "quoted" });
    console.log(`\n${transfers.length} quoted transfers found.`);
  }

  main().catch(console.error);
