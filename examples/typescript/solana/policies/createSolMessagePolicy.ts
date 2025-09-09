// Usage: pnpm tsx solana/policies/createSolMessagePolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

// Create a policy that only allows signing messages starting with "CDP:"
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Allow messages with CDP prefix only",
    rules: [
      {
        action: "accept",
        operation: "signSolMessage",
        criteria: [
          {
            type: "solMessage",
            match: "^CDP:.*",
          },
        ],
      },
    ],
  },
});

console.log("Created sol message policy: ", policy.id);
