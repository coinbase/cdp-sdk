// Usage: pnpm tsx custodial/transfers.ts
//
// Exercises the custodial transfers API (cdp.transfers) mounted onto CdpClient:
//   - listTransfers
//   - getTransferById
//   - createTransfer with execute:false (a fee quote; no funds move)
//
// Needs CDP_API_KEY_ID and CDP_API_KEY_SECRET (and CDP_BASE_PATH for a non-prod
// endpoint). The custodial APIs don't require CDP_WALLET_SECRET. See .env.example.

import { CdpClient } from "@coinbase/cdp-sdk";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { safePrettyPrint } from "../safePrettyPrint.js";

const cdp = new CdpClient({ basePath: process.env.CDP_BASE_PATH });

// An account to act as the transfer source.
const name = `transfers-${randomUUID().slice(0, 8)}`;
const account = await cdp.accounts.createAccount({
  idempotencyKey: randomUUID(),
  name,
});
console.log(`Source account: ${account.accountId}`);

// --- List transfers ----------------------------------------------------------
const transfers = await cdp.transfers.listTransfers({ pageSize: 10 });
console.log(`\nListed ${transfers.transfers.length} transfer(s).`);

// --- Get one by id (if any exist) --------------------------------------------
const first = transfers.transfers[0];
if (first?.transferId) {
  const fetched = await cdp.transfers.getTransferById({
    transferId: first.transferId,
  });
  console.log(`Fetched transfer ${fetched.transferId}`);
}

// --- Create a transfer QUOTE (execute:false → no funds move) ------------------
// A fresh account has no balance, so this returns either a quoted Transfer or a
// well-formed 4xx — both prove the request routes + signs end-to-end.
//
// `target.address` is the RECIPIENT wallet address; the token is identified by
// `asset`. Require a real recipient you control via env rather than hard-coding
// one — copying this example and flipping `execute` to true would otherwise send
// real funds to a baked-in address. (Never put a token contract here.)
const targetAddress = process.env.CDP_TRANSFER_TARGET_ADDRESS;
if (!targetAddress) {
  throw new Error(
    "Set CDP_TRANSFER_TARGET_ADDRESS to an onchain wallet address you control (the transfer recipient).",
  );
}

console.log("\nRequesting a transfer quote (execute:false)...");
try {
  const quote = await cdp.transfers.createTransfer({
    idempotencyKey: randomUUID(),
    source: { accountId: account.accountId, asset: "usd" },
    target: {
      address: targetAddress, // recipient wallet; asset below identifies the token
      network: "base",
      asset: "usdc",
    },
    amount: "1.00",
    asset: "usd",
    execute: false,
  });
  console.log("Quote returned:");
  safePrettyPrint(quote);
} catch (e: any) {
  // A 4xx is expected here (an unfunded account can't transfer) — that still
  // proves the request routes + signs. Anything else is a real failure: rethrow.
  const status = e?.statusCode;
  if (typeof status !== "number" || status < 400 || status >= 500) {
    throw e;
  }
  console.log(`Quote rejected (expected for empty account): ${status} ${e.body?.errorType ?? e.message}`);
}

console.log("\nDone.");
