// Usage: pnpm tsx policies/listProjectPolicies.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policies = await cdp.policies.listPolicies({ scope: "project" });
console.log("Listed project policies: ", JSON.stringify(policies, null, 2));
