// Usage: pnpm tsx custodial/paymentMethods.ts
//
// Exercises the custodial payment-methods API (cdp.paymentMethods):
//   - listPaymentMethods
//   - getPaymentMethod
//
// Payment methods are read-only here (they're provisioned out of band, e.g. a
// linked bank/card), so this lists them and fetches one by id if present.
//
// Needs CDP_API_KEY_ID and CDP_API_KEY_SECRET (and CDP_BASE_PATH for a non-prod
// endpoint). The custodial APIs don't require CDP_WALLET_SECRET. See .env.example.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient({ basePath: process.env.CDP_BASE_PATH });

// --- List payment methods ----------------------------------------------------
const list = await cdp.paymentMethods.listPaymentMethods({ pageSize: 10 });
const methods = list.paymentMethods ?? [];
console.log(`Listed ${methods.length} payment method(s).`);

// --- Get one by id (if any exist) --------------------------------------------
const first = methods[0];
if (first) {
  const fetched = await cdp.paymentMethods.getPaymentMethod({
    paymentMethodId: first.paymentMethodId,
  });
  // NOTE: deliberately do NOT print the full object — rail-specific details
  // (fedwire/swift/sepa) include sensitive bank data (routing/IBAN/BIC), which
  // shouldn't land in terminal or CI logs. Print only safe identifiers.
  console.log(`\nFetched payment method ${fetched.paymentMethodId} (rail: ${fetched.paymentRail}).`);
} else {
  console.log(
    "\nNo payment methods provisioned on this account — nothing to fetch."
  );
}

console.log("\nDone.");
