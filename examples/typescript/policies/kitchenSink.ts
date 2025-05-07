// Usage: pnpm tsx policies/kitchenSink.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: 'account',
    description: 'Account Allowlist Example',
    rules: [
      {
        action: 'accept',
        operation: 'signEvmTransaction',
        criteria: [
          {
            type: 'ethValue',
            ethValue: '1000000000000000000',
            operator: '<='
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
console.log("Created account policy: ", policy.id);

const updatedPolicy = await cdp.policies.updatePolicy({
  id: policy.id,
  policy: {
    description: 'Updated to Denylist Policy',
    rules: [
      {
        action: 'accept',
        operation: 'signEvmTransaction',
        criteria: [
          {
            type: 'ethValue',
            ethValue: '1000000000000000000',
            operator: '<='
          },
          {
            type: 'evmAddress',
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: 'not in'
          }
        ]
      }
    ]
  }
});
console.log("Updated policy: ", updatedPolicy.id);

const retrievedPolicy = await cdp.policies.getPolicyById({
  id: policy.id
});
console.log("Retrieved policy: ", JSON.stringify(retrievedPolicy, null, 2));

await cdp.policies.deletePolicy({ id: retrievedPolicy.id })
console.log("Deleted policy: ", retrievedPolicy.id);
