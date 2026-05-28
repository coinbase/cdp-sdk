/**
 * CDP JWT authentication and facilitator client for the x402 protocol.
 *
 * Generates per-endpoint JWT bearer tokens for authenticating with
 * the CDP hosted facilitator at api.cdp.coinbase.com, and provides
 * a factory for creating a pre-configured HTTPFacilitatorClient.
 */

import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { CDP_API_HOST, CDP_FACILITATOR_URL, FACILITATOR_PATHS } from "./constants.js";
import { SDK_METADATA } from "../constants.js";

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
}

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
 * Each call generates new JWTs scoped to the specific facilitator endpoints
 * (verify, settle, supported). JWTs are short-lived (2 minutes) and must be
 * regenerated for each request.
 *
 * @param credentials - CDP API key credentials (apiKeyId + apiKeySecret)
 * @returns A function matching the x402 `FacilitatorConfig.createAuthHeaders` signature
 */
export function createCdpAuthHeaders(
  credentials: FacilitatorCredentials,
): () => Promise<FacilitatorAuthHeaders> {
  return async (): Promise<FacilitatorAuthHeaders> => {
    const [verify, settle, supported] = await Promise.all([
      getEndpointAuthHeaders(credentials, FACILITATOR_PATHS.verify),
      getEndpointAuthHeaders(credentials, FACILITATOR_PATHS.settle),
      getEndpointAuthHeaders(credentials, FACILITATOR_PATHS.supported, "GET"),
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
 * Resolution order for each credential:
 * 1. Explicit arg value
 * 2. `CDP_SERVER_API_KEY_ID` / `CDP_SERVER_API_KEY_SECRET` env var
 * 3. `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` env var
 *
 * @throws {Error} If neither the arg nor any env var provides a value.
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
 * The returned client is pre-configured with the CDP hosted facilitator URL
 * and CDP JWT-based authentication. It implements the neutral
 * `HTTPFacilitatorClient` interface from `@x402/core/server` and can be passed
 * directly to `x402ResourceServer`.
 *
 * Credentials are resolved in order: explicit args → `CDP_SERVER_API_KEY_ID` /
 * `CDP_SERVER_API_KEY_SECRET` env vars → `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`
 * env vars.
 *
 * @param args - Optional credential overrides.
 * @returns A configured `HTTPFacilitatorClient` ready for use with x402ResourceServer.
 *
 * @example
 * ```typescript
 * // Reads credentials from CDP_API_KEY_ID and CDP_API_KEY_SECRET env vars
 * const facilitator = createCdpFacilitatorClient();
 *
 * const server = new x402ResourceServer(facilitator).register(
 *   "eip155:8453",
 *   new ExactEvmScheme(),
 * );
 * ```
 *
 */
export function createCdpFacilitatorClient(args?: CdpFacilitatorClientArgs): HTTPFacilitatorClient {
  const credentials = resolveFacilitatorCredentials(args);

  return new HTTPFacilitatorClient({
    url: CDP_FACILITATOR_URL,
    createAuthHeaders: createCdpAuthHeaders(credentials),
  });
}

export {
  CDP_FACILITATOR_URL,
  CDP_API_HOST,
  FACILITATOR_PATHS,
  CDP_FACILITATOR_NETWORKS,
  CDP_USDC_ADDRESSES,
} from "./constants.js";
export type { CdpFacilitatorNetwork, CdpUsdcNetwork, CdpUsdcAddress } from "./constants.js";
