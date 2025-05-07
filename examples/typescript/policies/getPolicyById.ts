// Usage: pnpm tsx evm/getPolicyById.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: 'account',
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

const retrievedPolicy = await cdp.policies.getPolicyById({
  policyId: policy.id
});
console.log("Retrieved policy: ", JSON.stringify(retrievedPolicy, null, 2));
