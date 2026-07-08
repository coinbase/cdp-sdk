// Usage: pnpm tsx custodial/depositDestinations.ts
//
// Exercises the custodial deposit-destinations API (cdp.depositDestinations):
//   - createDepositDestination (crypto)
//   - getDepositDestinationById
//   - listDepositDestinations
//
// Needs CDP_API_KEY_ID and CDP_API_KEY_SECRET (and CDP_BASE_PATH for a non-prod
// endpoint). The custodial APIs don't require CDP_WALLET_SECRET. See .env.example.

import { CdpClient } from "@coinbase/cdp-sdk";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { safePrettyPrint } from "../safePrettyPrint.js";

const cdp = new CdpClient({ basePath: process.env.CDP_BASE_PATH });

// Deposit destinations belong to an account.
const accountName = `deposit-${randomUUID().slice(0, 8)}`;
const account = await cdp.accounts.createAccount({
  idempotencyKey: randomUUID(),
  name: accountName,
});
console.log(`Account: ${account.accountId}`);

// --- Create a crypto deposit destination (a USDC-on-Base address) ------------
const created = await cdp.depositDestinations.createDepositDestination({
  idempotencyKey: randomUUID(),
  type: "crypto",
  accountId: account.accountId,
  target: { accountId: account.accountId, asset: "usdc" },
  crypto: { network: "base" },
});
console.log("\nCreated deposit destination:");
safePrettyPrint(created);

// --- Fetch it back by id -----------------------------------------------------
const fetched = await cdp.depositDestinations.getDepositDestinationById({
  depositDestinationId: created.depositDestinationId,
});
console.log(
  `\nFetched ${fetched.depositDestinationId} (type: ${fetched.type})`,
);

// --- List deposit destinations for the account -------------------------------
const list = await cdp.depositDestinations.listDepositDestinations({
  accountId: account.accountId,
});
console.log(
  `\nListed ${list.depositDestinations.length} deposit destination(s).`,
);

console.log("\nDone.");
