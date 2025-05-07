// Usage: pnpm tsx evm/updatePolicy.ts

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
        ]
      }
    ]
  }
});

const updatedPolicy = await cdp.policies.updatePolicy({
  policyId: policy.id,
  policy: {
    description: 'Updated Policy',
    rules: [
      {
        action: 'reject',
        operation: 'signEvmTransaction',
        criteria: [
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
console.log("Updated policy: ", JSON.stringify(updatedPolicy, null, 2));
