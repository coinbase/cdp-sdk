// Usage: pnpm tsx policies/deletePolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: 'account',
    description: 'Temporary Policy',
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

await cdp.policies.deletePolicy({ policyId: policy.id })
console.log("Deleted policy: ", policy.id);
