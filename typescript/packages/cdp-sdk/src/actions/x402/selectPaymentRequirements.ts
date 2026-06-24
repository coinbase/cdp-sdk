import { solanaDevnetCaip2, solanaMainnetCaip2 } from "../../x402/constants.js";

import type { Network, PaymentRequired } from "@x402/core/types";

type Requirement = PaymentRequired["accepts"][number];
type Candidate = { index: number; requirement: Requirement };

const USDC_EVM_ASSET_BY_CHAIN_ID: Record<number, string> = {
  1328: "0x4fcf1784b31630811181f670aea7a7bef803eaed",
  1329: "0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392",
  137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  1514: "0xF1815bd50389c46847f0Bda824eC8da914045D14",
  2741: "0x84a71ccd554cc1b02749b35d22f684cc8ec987e1",
  3338: "0xbbA60da06c2c5424f03f7434542280FCAd453d10",
  4689: "0xcdf79194c6c285077a58da47641d4dbe51f63542",
  11124: "0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc",
  41923: "0x12a272A581feE5577A5dFa371afEB4b2F3a8C2F8",
  43113: "0x5425890298aed601595a70AB815c96711a31Bc65",
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  80002: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  324705682: "0x2e08028E3C4c2356572E096d8EF835cD5C6030bD",
};

const USDC_SVM_ASSET_BY_CAIP2: Record<string, string> = {
  [solanaMainnetCaip2]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  [solanaDevnetCaip2]: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
};

/**
 * Checks whether a payment requirement's asset matches known USDC on its network.
 *
 * @param requirement - Candidate payment requirement to inspect.
 * @returns True when the requirement's asset is recognized USDC for its network.
 */
function isUsdcRequirement(requirement: Requirement): boolean {
  if (requirement.network.startsWith("eip155:")) {
    const chainId = Number(requirement.network.slice("eip155:".length));
    if (Number.isNaN(chainId)) {
      return false;
    }

    const usdcAsset = USDC_EVM_ASSET_BY_CHAIN_ID[chainId];
    return !!usdcAsset && requirement.asset.toLowerCase() === usdcAsset.toLowerCase();
  }

  if (requirement.network.startsWith("solana:")) {
    const usdcAsset = USDC_SVM_ASSET_BY_CAIP2[requirement.network];
    return !!usdcAsset && requirement.asset === usdcAsset;
  }

  return false;
}

/**
 * CDP override of x402's legacy `selectPaymentRequirements`.
 *
 * Mirrors x402's default behavior (network/scheme filter + USDC preference) but
 * returns an `acceptedIndex` into `paymentRequired.accepts` so callers can pass
 * the index directly into `account.signX402Payment(...)`.
 *
 * @param paymentRequired - The PaymentRequired response from an x402 resource server.
 * @param network - Optional network (or list of networks) to filter by before selection.
 * @param scheme - Optional scheme to filter by before selection.
 * @returns Index into `paymentRequired.accepts`.
 */
export function selectPaymentRequirements(
  paymentRequired: PaymentRequired,
  network?: Network | Network[],
  scheme?: Requirement["scheme"],
): number {
  if (paymentRequired.accepts.length === 0) {
    throw new Error("paymentRequired.accepts must contain at least one payment requirement.");
  }

  const broadlyAccepted: Candidate[] = paymentRequired.accepts
    .map((requirement, index) => ({ requirement, index }))
    .filter(({ requirement }) => {
      const isExpectedScheme = !scheme || requirement.scheme === scheme;
      const isExpectedNetwork =
        !network ||
        (Array.isArray(network)
          ? network.includes(requirement.network)
          : network === requirement.network);

      return isExpectedScheme && isExpectedNetwork;
    });

  const preferredUsdc = broadlyAccepted.find(({ requirement }) => isUsdcRequirement(requirement));
  if (preferredUsdc) {
    return preferredUsdc.index;
  }

  if (broadlyAccepted.length > 0) {
    return broadlyAccepted[0].index;
  }

  return 0;
}
