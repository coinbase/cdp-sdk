// Usage: pnpm tsx policies/createAccountPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Account Allowlist Example",
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
      {
        action: "accept",
        operation: "signEvmHash",
      },
      {
        action: "accept",
        operation: "signEvmMessage",
        criteria: [
          {
            type: "evmMessage",
            match: ".*",
          },
        ],
      },
    ],
  },
});
console.log("Created account policy: ", policy.id);
