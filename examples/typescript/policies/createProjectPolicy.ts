// Usage: pnpm tsx evm/createProjectPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: 'project',
    description: 'Project Policy',
    rules: [
      {
        action: 'reject',
        operation: 'signEvmTransaction',
        criteria: [
          {
            type: 'ethValue',
            ethValue: '0',
            operator: '>='
          },
          {
            type: 'evmAddress',
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: 'in'
          }
        ]
      }
    ]
  }
});
console.log("Created project policy: ", policy.id);
