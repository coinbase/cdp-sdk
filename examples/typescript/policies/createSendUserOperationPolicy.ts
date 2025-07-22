// Usage: pnpm tsx policies/createSendUserOperationPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "SendUserOperation Example",
    rules: [
      {
        action: "accept",
        operation: "sendUserOperation",
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
