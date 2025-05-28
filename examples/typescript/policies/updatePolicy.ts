// Usage: pnpm tsx policies/updatePolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Initial Allowlist Policy",
    rules: [
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "evmAddress",
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: "in",
          },
        ],
      },
    ],
  },
});

const updatedPolicy = await cdp.policies.updatePolicy({
  id: policy.id,
  policy: {
    description: "Updated Denylist Policy",
    rules: [
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "evmAddress",
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: "not in",
          },
        ],
      },
    ],
  },
});
console.log("Updated policy: ", JSON.stringify(updatedPolicy, null, 2));
