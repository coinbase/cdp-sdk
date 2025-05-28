// Usage: pnpm tsx policies/createSolAllowlistPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "SOL Allowlist Policy",
    rules: [
      {
        action: "accept",
        operation: "signSolTransaction",
        criteria: [
          {
            type: "solAddress",
            addresses: ["DtdSSG8ZJRZVv5Jx7K1MeWp7Zxcu19GD5wQRGRpQ9uMF"],
            operator: "in",
          },
        ],
      },
    ],
  },
});
console.log("Created sol allowlist policy: ", policy.id);
