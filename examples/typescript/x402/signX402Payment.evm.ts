// Usage: pnpm tsx x402/signX402Payment.evm.ts

import "dotenv/config";
import { CdpClient, selectPaymentRequirements } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const account = await cdp.evm.getOrCreateAccount({
  name: process.env.CDP_ACCOUNT_NAME ?? "x402-direct-signing-evm",
});

const paymentRequired = readPaymentRequired<Parameters<typeof account.signX402Payment>[0]>();
const acceptedIndex = readAcceptedIndex() ?? selectPaymentRequirements(paymentRequired);

const payment = await account.signX402Payment(paymentRequired, acceptedIndex);

console.log("Signed x402 payment with EVM account:", account.address);
console.log(JSON.stringify(payment, null, 2));

await sendGrpcMetadata("x402-payment", payment);
await enqueuePaidJob({ payment, transport: "queue" });

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

async function sendGrpcMetadata(key: string, value: unknown) {
  const metadataValue = Buffer.from(JSON.stringify(value)).toString("base64");
  console.log(`Attach to gRPC metadata: ${key}=${metadataValue}`);
}

async function enqueuePaidJob(job: { payment: unknown; transport: string }) {
  console.log("Queue job payload:", JSON.stringify(job, null, 2));
}

