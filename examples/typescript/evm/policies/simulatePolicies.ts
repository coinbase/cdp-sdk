// Usage: pnpm tsx evm/policies/simulatePolicies.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther, serializeTransaction } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();
const account = await cdp.evm.getOrCreateAccount({
  name: "policy-simulation-example",
});

const transaction = serializeTransaction({
  chainId: baseSepolia.id,
  type: "eip1559",
  nonce: 0,
  gas: 21000n,
  maxFeePerGas: 1000000000n,
  maxPriorityFeePerGas: 100000000n,
  to: "0x000000000000000000000000000000000000dEaD",
  value: parseEther("0.001"),
  data: "0x",
});

const result = await cdp.policies.simulate({
  operation: "signEvmTransaction",
  address: account.address,
  transaction,
});

console.log("Action:", result.action);
console.log("Reason:", result.reason);
if (result.matchedRule) {
  console.log(
    "Matched rule:",
    result.matchedRule.policy.id,
    result.matchedRule.ruleIndex,
  );
}
for (const rule of result.unmatchedRules) {
  console.log(
    "Unmatched rule:",
    rule.policy.id,
    rule.ruleIndex,
    rule.criterionIndex,
  );
  console.log("Criterion:", rule.criterion);
  console.log("Observed:", rule.observed);
}
