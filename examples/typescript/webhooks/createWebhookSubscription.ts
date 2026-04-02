// Usage: pnpm tsx webhooks/createWebhookSubscription.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const subscription = await cdp.webhooks.createSubscription({
  description: "Monitor wallet transactions",
  eventTypes: [
    "wallet.transaction.pending",
    "wallet.transaction.confirmed",
    "wallet.transaction.failed",
  ],
  targetUrl: "https://example.com/webhook",
  isEnabled: true,
});

console.log("Subscription ID:", subscription.subscriptionId);
console.log("Event types:", subscription.eventTypes);
console.log("Target URL:", subscription.target.url);
console.log("Enabled:", subscription.isEnabled);
console.log("Created at:", subscription.createdAt);
