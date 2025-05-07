// Usage: pnpm tsx policies/updatePolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: 'account',
    description: 'Initial Allowlist Policy',
    rules: [
      {
        action: 'accept',
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

const updatedPolicy = await cdp.policies.updatePolicy({
  policyId: policy.id,
  policy: {
    description: 'Updated Allowlist Policy',
    rules: [
      {
        action: 'accept',
        operation: 'signEvmTransaction',
        criteria: [
          {
            type: 'evmAddress',
            addresses: [],
            operator: 'in'
          }
        ]
      }
    ]
  }
});
console.log("Updated policy: ", JSON.stringify(updatedPolicy, null, 2));
