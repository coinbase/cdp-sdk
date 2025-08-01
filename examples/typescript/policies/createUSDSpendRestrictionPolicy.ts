// Usage: pnpm tsx policies/createSolAllowlistPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Reject over one hundred dollars",
    rules: [
      {
        action: "reject",
        operation: "sendEvmTransaction",
        criteria: [
          {
            type: "netUSDChange",
            changeCents: 10000,
            operator: ">",
          },
        ],
      },
    ],
  },
});
console.log("Created USD restriction policy: ", policy.id);
