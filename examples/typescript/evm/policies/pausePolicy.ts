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

const pausedPolicy = await cdp.policies.pausePolicy({
	id: policy.id,
	resumeAt: new Date(Date.now() + 60 * 60 * 1000),
});
console.log("Paused policy: ", JSON.stringify(pausedPolicy, null, 2));
