/**
 * Shared x402 resource server for the Next.js example, powered by the CDP SDK.
 *
 * This is a standard `@x402/core` resource server with exactly one CDP change
 * versus a self-hosted setup: the facilitator is `createCdpFacilitatorClient()`
 * — the CDP hosted facilitator, a drop-in for `HTTPFacilitatorClient`. It reads
 * CDP_API_KEY_ID / CDP_API_KEY_SECRET from the environment.
 *
 * Set PAY_TO to the EVM address that should receive payments. (Prefer a
 * CDP-managed wallet — see the README for the `createX402Server` alternative,
 * which provisions one for you.)
 */
import { x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
import type { Address } from "viem";

export const NETWORK = "eip155:84532"; // Base Sepolia
export const payTo = (process.env.PAY_TO ?? "") as Address;

if (!payTo) throw new Error("PAY_TO env var required (an EVM address to receive payments)");

// Before — self-hosted facilitator: new HTTPFacilitatorClient({ url, createAuthHeaders })
// After  — CDP hosted facilitator (same type, drop-in replacement):
export const server = new x402ResourceServer(createCdpFacilitatorClient()).register(
  NETWORK,
  new ExactEvmScheme(),
);
