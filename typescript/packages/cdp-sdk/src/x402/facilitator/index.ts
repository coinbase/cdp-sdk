/**
 * CDP JWT authentication and facilitator client for the x402 protocol.
 *
 * Generates per-endpoint JWT bearer tokens for authenticating with
 * the CDP hosted facilitator at api.cdp.coinbase.com, and provides
 * a factory for creating a pre-configured HTTPFacilitatorClient.
 */

import { HTTPFacilitatorClient } from "@x402/core/server";

import { generateJwt } from "../../auth/index.js";
import { SDK_METADATA } from "../constants.js";

/** CDP facilitator base URL (production) */
export const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

/** CDP facilitator base URL (devnet) */
const CDP_FACILITATOR_DEVNET_URL = "https://api.cdp.coinbase.com/platform/v2/x402/devnet";

/** CDP API host (without protocol) */
export const CDP_API_HOST = "api.cdp.coinbase.com";

/** Facilitator endpoint paths */
export const FACILITATOR_PATHS = {
  verify: "/platform/v2/x402/verify",
  settle: "/platform/v2/x402/settle",
  supported: "/platform/v2/x402/supported",
} as const;

/** Devnet facilitator endpoint paths */
const FACILITATOR_DEVNET_PATHS = {
  verify: "/platform/v2/x402/devnet/verify",
  settle: "/platform/v2/x402/devnet/settle",
  supported: "/platform/v2/x402/devnet/supported",
} as const;

export {
  CDP_FACILITATOR_NETWORKS,
  CDP_USDC_ADDRESSES,
  CDP_EVM_RPC_URLS,
} from "../../networks/index.js";
export type {
  CdpFacilitatorNetwork,
  CdpUsdcNetwork,
  CdpUsdcAddress,
} from "../../networks/index.js";

/**
 * Credentials needed to authenticate with the CDP facilitator.
 */
export interface FacilitatorCredentials {
  apiKeyId: string;
  apiKeySecret: string;
}

/**
 * Auth headers keyed by facilitator endpoint.
 */
export interface FacilitatorAuthHeaders {
  verify: Record<string, string>;
  settle: Record<string, string>;
  supported: Record<string, string>;
}

/**
 * Args for createCdpFacilitatorClient.
 */
export interface CdpFacilitatorClientArgs {
  /**
   * CDP API key ID. Falls back to `CDP_SERVER_API_KEY_ID` then `CDP_API_KEY_ID` env var.
   */
  apiKeyId?: string;
  /**
   * CDP API key secret. Falls back to `CDP_SERVER_API_KEY_SECRET` then `CDP_API_KEY_SECRET`
   * env var.
   */
  apiKeySecret?: string;
  /**
   * Target network environment. Defaults to `"mainnet"` (production).
   * Use `"devnet"` to target the CDP devnet facilitator endpoint.
   */
  network?: "mainnet" | "devnet";
}

type FacilitatorEnvironment = NonNullable<CdpFacilitatorClientArgs["network"]>;

/**
 *
 * @param credentials
 * @param path
 * @param method
 */
async function getEndpointAuthHeaders(
  credentials: FacilitatorCredentials,
  path: string,
  method: "GET" | "POST" = "POST",
): Promise<Record<string, string>> {
  const jwt = await generateJwt({
    apiKeyId: credentials.apiKeyId,
    apiKeySecret: credentials.apiKeySecret,
    requestMethod: method,
    requestHost: CDP_API_HOST,
    requestPath: path,
  });

  const correlationContext = Object.entries(SDK_METADATA)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  return {
    Authorization: `Bearer ${jwt}`,
    "Correlation-Context": correlationContext,
  };
}

/**
 * Creates a function that generates fresh CDP auth headers for each facilitator request.
 *
 * @param credentials - CDP API key credentials (apiKeyId + apiKeySecret)
 * @param environment - Target facilitator environment used to select signed paths.
 * @returns A function matching the x402 `FacilitatorConfig.createAuthHeaders` signature
 */
export function createCdpAuthHeaders(
  credentials: FacilitatorCredentials,
  environment: FacilitatorEnvironment = "mainnet",
): () => Promise<FacilitatorAuthHeaders> {
  const paths = environment === "devnet" ? FACILITATOR_DEVNET_PATHS : FACILITATOR_PATHS;

  return async (): Promise<FacilitatorAuthHeaders> => {
    const [verify, settle, supported] = await Promise.all([
      getEndpointAuthHeaders(credentials, paths.verify),
      getEndpointAuthHeaders(credentials, paths.settle),
      getEndpointAuthHeaders(credentials, paths.supported, "GET"),
    ]);

    return {
      verify,
      settle,
      supported,
    };
  };
}

/**
 * Resolves facilitator credentials from explicit args or environment variables.
 *
 * @param args
 */
function resolveFacilitatorCredentials(args?: CdpFacilitatorClientArgs): FacilitatorCredentials {
  const apiKeyId =
    args?.apiKeyId ?? process.env.CDP_SERVER_API_KEY_ID ?? process.env.CDP_API_KEY_ID;
  const apiKeySecret =
    args?.apiKeySecret ?? process.env.CDP_SERVER_API_KEY_SECRET ?? process.env.CDP_API_KEY_SECRET;

  const missing: string[] = [];
  if (!apiKeyId) missing.push("CDP_SERVER_API_KEY_ID / CDP_API_KEY_ID");
  if (!apiKeySecret) missing.push("CDP_SERVER_API_KEY_SECRET / CDP_API_KEY_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required CDP credentials: ${missing.join(", ")}. ` +
        "Provide them via args or set the corresponding environment variables.",
    );
  }

  return { apiKeyId: apiKeyId!, apiKeySecret: apiKeySecret! };
}

/**
 * Creates a CDP-authenticated x402 facilitator client.
 *
 * @param args - Optional credential overrides and network selection.
 *   Pass `{ network: "devnet" }` to target the CDP devnet facilitator.
 * @returns A configured `HTTPFacilitatorClient` ready for use with x402ResourceServer.
 *
 * @example
 * ```typescript
 * // Production (default)
 * const facilitator = createCdpFacilitatorClient();
 *
 * // Devnet
 * const devFacilitator = createCdpFacilitatorClient({ network: "devnet" });
 * ```
 */
export function createCdpFacilitatorClient(args?: CdpFacilitatorClientArgs): HTTPFacilitatorClient {
  const credentials = resolveFacilitatorCredentials(args);
  const environment = args?.network ?? "mainnet";
  const url = environment === "devnet" ? CDP_FACILITATOR_DEVNET_URL : CDP_FACILITATOR_URL;

  return new HTTPFacilitatorClient({
    url,
    createAuthHeaders: createCdpAuthHeaders(credentials, environment),
  });
}
