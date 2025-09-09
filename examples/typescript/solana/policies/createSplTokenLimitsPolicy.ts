// Usage: pnpm tsx solana/policies/createSplTokenLimitsPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

// Create a policy that allows sending up to 1 USDC on Solana devnet
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "SPL Token Limits Policy",
    rules: [
      {
        action: "accept",
        operation: "sendSolTransaction",
        criteria: [
          {
            type: "splValue",
            splValue: "1000000",
            operator: "<=",
          },
          {
            type: "mintAddress",
            addresses: ["4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"],
            operator: "in",
          },
        ],
      },
    ],
  },
});
console.log("Created spl token limits policy: ", policy.id);
