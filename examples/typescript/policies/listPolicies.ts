// Usage: pnpm tsx policies/listPolicies.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policies = await cdp.policies.listPolicies();
console.log("Listed policies: ", JSON.stringify(policies, null, 2));
