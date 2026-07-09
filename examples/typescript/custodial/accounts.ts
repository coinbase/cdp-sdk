// Usage: pnpm tsx custodial/accounts.ts
//
// Exercises the flexible-custody (custodial) APIs newly mounted onto CdpClient:
//   cdp.accounts        — accounts + balances
//   cdp.transfers       — transfers
//   cdp.paymentMethods  — payment methods
//   cdp.depositDestinations — deposit destinations
//
// Requires CDP_API_KEY_ID and CDP_API_KEY_SECRET in the env (the custodial APIs
// don't need CDP_WALLET_SECRET — that's only for wallet/account signing).
// CdpClient reads them automatically; see .env.example.

import { CdpClient } from "@coinbase/cdp-sdk";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { safePrettyPrint } from "../safePrettyPrint.js";

// Point at a non-prod endpoint when CDP_BASE_PATH is set (e.g. the dev API);
// when it's unset the SDK falls back to the prod base path.
const cdp = new CdpClient({ basePath: process.env.CDP_BASE_PATH });

// --- Create a (custodial) account --------------------------------------------
const name = `example-${randomUUID().slice(0, 8)}`;
const created = await cdp.accounts.createAccount({
  idempotencyKey: randomUUID(),
  name,
});
console.log("Created account:");
safePrettyPrint(created);

// --- Fetch it back by id -----------------------------------------------------
const fetched = await cdp.accounts.getAccountById({
  accountId: created.accountId,
});
console.log(`\nFetched account ${fetched.accountId} (name: ${fetched.name})`);

// --- List accounts -----------------------------------------------------------
const accounts = await cdp.accounts.listAccounts({ pageSize: 10 });
console.log(`\nListed ${accounts.accounts.length} account(s).`);

// --- List balances for the new account (starts empty) ------------------------
const balances = await cdp.accounts.listBalances({
  accountId: created.accountId,
  pageSize: 10,
});
console.log(`\nAccount has ${balances.balances.length} balance(s).`);
if (balances.balances.length > 0) {
  const symbol = balances.balances[0].asset.symbol;
  const byAsset = await cdp.accounts.getBalanceByAsset({
    accountId: created.accountId,
    asset: symbol,
  });
  console.log(`Balance for ${symbol}:`);
  safePrettyPrint(byAsset);
}

// --- Read-only: payment methods + transfers ----------------------------------
const paymentMethods = await cdp.paymentMethods.listPaymentMethods({
  pageSize: 10,
});
console.log(
  `\nListed ${paymentMethods.paymentMethods?.length ?? 0} payment method(s).`,
);

const transfers = await cdp.transfers.listTransfers({ pageSize: 10 });
console.log(`Listed ${transfers.transfers.length} transfer(s).`);

console.log("\nDone.");
