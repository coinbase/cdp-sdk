// Usage: pnpm tsx evm/policies/createRateLimitingPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

// Create a defense-in-depth policy for a payment processing application.
// This policy combines rate limiting with value caps and address allowlists
// to protect against rapid fund draining, excessive spending, and unauthorized recipients.
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "project",
    description: "Rate Limiting Policy Example",
    rules: [
      // Rule 1: Accept EVM transaction signing only if:
      // - The recipient is in the known merchant allowlist
      // - The transaction value is under 0.5 ETH
      // - No more than 20 transactions are signed within a 24-hour window
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "evmAddress",
            addresses: [
              "0x000000000000000000000000000000000000dEaD",
              "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            ],
            operator: "in",
          },
          {
            type: "ethValue",
            ethValue: "500000000000000000", // 0.5 ETH in wei
            operator: "<=",
          },
          {
            type: "rateLimiting",
            window: "1d",
            maxCount: 20,
          },
        ],
      },

      // Rule 2: Accept EVM transaction sends only if:
      // - The transaction is on Base or Base Sepolia
      // - The total cumulative USD value stays under $500 in a rolling 7-day window
      // - The individual transaction is under $100 in net USD exposure
      {
        action: "accept",
        operation: "sendEvmTransaction",
        criteria: [
          {
            type: "evmNetwork",
            networks: ["base", "base-sepolia"],
            operator: "in",
          },
          {
            type: "netUSDChange",
            changeCents: 10000, // $100.00 per transaction
            operator: "<=",
          },
          {
            type: "rateLimiting",
            window: "7d",
            maxValueCents: 50000, // $500.00 cumulative over 7 days
          },
        ],
      },

      // Rule 3: Accept end-user EVM transaction signing with a tight
      // per-user rate limit — max 5 transactions per hour — to guard
      // against compromised sessions or automated abuse.
      {
        action: "accept",
        operation: "signEndUserEvmTransaction",
        criteria: [
          {
            type: "ethValue",
            ethValue: "100000000000000000", // 0.1 ETH in wei
            operator: "<=",
          },
          {
            type: "rateLimiting",
            window: "1h",
            maxCount: 5,
          },
        ],
      },

      // Rule 4: Accept end-user EVM transaction sends with a daily
      // spending cap of $50 to limit exposure for custodied end-user wallets.
      {
        action: "accept",
        operation: "sendEndUserEvmTransaction",
        criteria: [
          {
            type: "evmNetwork",
            networks: ["base"],
            operator: "in",
          },
          {
            type: "rateLimiting",
            window: "1d",
            maxValueCents: 5000, // $50.00 per day
          },
        ],
      },
    ],
  },
});

console.log("Created rate limiting policy:", policy.id);