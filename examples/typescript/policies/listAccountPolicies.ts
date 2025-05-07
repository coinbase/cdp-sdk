// Usage: pnpm tsx policies/listAccountPolicies.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policies = await cdp.policies.listPolicies({ scope: 'account' });
console.log("Listed account policies: ", JSON.stringify(policies, null, 2));
