// Usage: pnpm tsx policies/createProjectPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "project",
    description: "Project Allowlist Example",
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
      {
        action: "accept",
        operation: "sendEvmTransaction",
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
          {
            type: "evmNetwork",
            networks: ["base"],
            operator: "in",
          },
        ],
      },
    ],
  },
});
console.log("Created project policy: ", policy.id);
