// Usage: pnpm tsx evm/listProjectPolicies.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policies = await cdp.policies.listPolicies({ scope: 'project' });
console.log("Listed project policies: ", JSON.stringify(policies, null, 2));
