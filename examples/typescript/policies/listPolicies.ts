// Usage: pnpm tsx evm/listPolicies.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
const policies = await cdp.policies.listPolicies();
console.log("Listed policies: ", JSON.stringify(policies, null, 2));
