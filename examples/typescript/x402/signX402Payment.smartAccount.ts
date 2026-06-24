// Usage: pnpm tsx x402/signX402Payment.smartAccount.ts

import "dotenv/config";
import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const owner = await cdp.evm.getOrCreateAccount({
  name: process.env.CDP_OWNER_ACCOUNT_NAME ?? "x402-direct-signing-owner",
});
const smartAccount = await cdp.evm.getOrCreateSmartAccount({
  name: process.env.CDP_ACCOUNT_NAME ?? "x402-direct-signing-smart",
  owner,
});

const paymentRequired = readPaymentRequired<Parameters<typeof smartAccount.signX402Payment>[0]>();
const acceptedIndex = readAcceptedIndex();

const payment = await smartAccount.signX402Payment(paymentRequired, acceptedIndex);

console.log("Signed x402 payment with EVM smart account:", smartAccount.address);
console.log(JSON.stringify(payment, null, 2));

const mcpToolResult = {
  content: [{ type: "text", text: "Paid tool result" }],
  _meta: { x402Payment: payment },
};
console.log("MCP tool result payload:", JSON.stringify(mcpToolResult, null, 2));

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

