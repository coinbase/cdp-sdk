/**
 * x402 support for the CDP SDK.
 *
 * Import from `@coinbase/cdp-sdk/x402` to access the CDP-authenticated
 * x402 facilitator client, which authenticates with the CDP hosted facilitator
 * at `api.cdp.coinbase.com` and can be passed directly to `x402ResourceServer`
 * from `@x402/core/server`.
 *
 * ## Quick start
 *
 * ### Drop in the CDP hosted facilitator (x402 Dev)
 *
 * ```typescript
 * import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
 * import { x402ResourceServer } from "@x402/core/server";
 * import { ExactEvmScheme } from "@x402/evm/exact/server";
 *
 * // Set CDP_API_KEY_ID and CDP_API_KEY_SECRET in your environment
 * const facilitator = createCdpFacilitatorClient();
 *
 * const server = new x402ResourceServer(facilitator)
 *   .register("eip155:8453", new ExactEvmScheme());
 * ```
 *
 * @module
 */

export { createCdpFacilitatorClient, CDP_FACILITATOR_URL } from "./facilitator.js";
export type { CdpFacilitatorClientArgs } from "./facilitator.js";
