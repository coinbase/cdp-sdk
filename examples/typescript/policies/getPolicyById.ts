// Usage: pnpm tsx policies/getPolicyById.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Project Policy",
    rules: [
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "ethValue",
            ethValue: "1000000000000000000",
            operator: "<=",
          },
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

const retrievedPolicy = await cdp.policies.getPolicyById({
  id: policy.id,
});
console.log("Retrieved policy: ", JSON.stringify(retrievedPolicy, null, 2));
