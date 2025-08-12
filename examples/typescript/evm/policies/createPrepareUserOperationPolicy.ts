// Usage: pnpm tsx evm/policies/createPrepareUserOperationPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "PrepareUserOperation Example",
    rules: [
      {
        action: "accept",
        operation: "prepareUserOperation",
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
console.log("Created account policy: ", policy.id);
