import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const policy = await cdp.policies.createPolicy({
	policy: {
		scope: "account",
		description: "Allowlist Policy",
		rules: [
			{
				action: "accept",
				operation: "signEvmTransaction",
				criteria: [
					{
						type: "evmAddress",
						addresses: ["0x000000000000000000000000000000000000dEaD"],
						operator: "in",
					},
				],
			},
		],
	},
});

await cdp.policies.pausePolicy({ id: policy.id });
const resumedPolicy = await cdp.policies.resumePolicy({ id: policy.id });
console.log("Policy status: ", resumedPolicy.status);
