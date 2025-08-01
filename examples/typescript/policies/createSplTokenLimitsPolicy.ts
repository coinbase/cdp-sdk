// Usage: pnpm tsx policies/createSplTokenLimitsPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
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
