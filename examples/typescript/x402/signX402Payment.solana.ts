// Usage: pnpm tsx x402/signX402Payment.solana.ts

import "dotenv/config";
import { CdpClient, selectPaymentRequirements } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const account = await cdp.solana.getOrCreateAccount({
  name: process.env.CDP_ACCOUNT_NAME ?? "x402-direct-signing-solana",
});

const paymentRequired = readPaymentRequired<Parameters<typeof account.signX402Payment>[0]>();
const acceptedIndex = readAcceptedIndex() ?? selectPaymentRequirements(paymentRequired);

const payment = await account.signX402Payment(paymentRequired, acceptedIndex);

console.log("Signed x402 payment with Solana account:", account.address);
console.log(JSON.stringify(payment, null, 2));

await publishBatchJob({ payment, account: account.address });

function readPaymentRequired<T>(): T {
  const raw = process.env.X402_PAYMENT_REQUIRED_JSON;
  if (!raw) {
    throw new Error(
      "Set X402_PAYMENT_REQUIRED_JSON to the paymentRequired object returned by your resource server.",
    );
  }
  return JSON.parse(raw) as T;
}

function readAcceptedIndex(): number | undefined {
  const raw = process.env.X402_ACCEPTED_INDEX;
  return raw === undefined ? undefined : Number(raw);
}

async function publishBatchJob(job: { payment: unknown; account: string }) {
  console.log("Batch job payload:", JSON.stringify(job, null, 2));
}

