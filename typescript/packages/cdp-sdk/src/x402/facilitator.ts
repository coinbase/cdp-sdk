/*
 * CDP JWT authentication and facilitator client for the x402 protocol.
 */
import { HTTPFacilitatorClient } from "@x402/core/server";

import { generateJwt } from "../auth/index.js";
import { version } from "../version.js";

/** CDP facilitator base URL. */
export const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

const SDK_METADATA = {
  sdkLanguage: "typescript",
  source: "cdp-sdk",
  sourceVersion: version,
};

interface FacilitatorCredentials {
  apiKeyId: string;
  apiKeySecret: string;
}

interface FacilitatorAuthHeaders {
  verify: Record<string, string>;
  settle: Record<string, string>;
  supported: Record<string, string>;
}

interface ResolvedFacilitatorEndpoints {
  /** The URL passed to HTTPFacilitatorClient. */
  url: string;
  /** The hostname used for JWT audience binding. */
  host: string;
  /** Fully-qualified paths for each x402 operation. */
  paths: {
    verify: string;
    settle: string;
    supported: string;
  };
}

/**
 * Parses a base URL into the host and per-operation paths needed for JWT
 * signing. Strips any trailing slash from the pathname before appending
 * operation suffixes so the paths are always well-formed.
 *
 * @param baseUrl - The facilitator base URL to parse.
 * @returns The resolved URL, JWT signing host, and per-operation paths.
 * @throws {Error} If `baseUrl` is not a valid URL.
 */
const resolveFacilitatorEndpoints = (baseUrl: string): ResolvedFacilitatorEndpoints => {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(
      `Invalid facilitator baseUrl "${baseUrl}": must be a valid URL (e.g. "https://api.cdp.coinbase.com/platform/v2/x402").`,
    );
  }
  const basePath = parsed.pathname.replace(/\/$/, "");
  return {
    url: baseUrl,
    host: parsed.host,
    paths: {
      verify: `${basePath}/verify`,
      settle: `${basePath}/settle`,
      supported: `${basePath}/supported`,
    },
  };
};

const getEndpointAuthHeaders = async (
  credentials: FacilitatorCredentials,
  host: string,
  path: string,
  method: "GET" | "POST" = "POST",
): Promise<Record<string, string>> => {
  const jwt = await generateJwt({
    apiKeyId: credentials.apiKeyId,
    apiKeySecret: credentials.apiKeySecret,
    requestMethod: method,
    requestHost: host,
    requestPath: path,
  });

  const correlationContext = Object.entries(SDK_METADATA)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  return {
    Authorization: `Bearer ${jwt}`,
    "Correlation-Context": correlationContext,
  };
};

const createCdpAuthHeaders = (
  credentials: FacilitatorCredentials,
  host: string,
  paths: ResolvedFacilitatorEndpoints["paths"],
): (() => Promise<FacilitatorAuthHeaders>) => {
  return async (): Promise<FacilitatorAuthHeaders> => {
    const [verify, settle, supported] = await Promise.all([
      getEndpointAuthHeaders(credentials, host, paths.verify),
      getEndpointAuthHeaders(credentials, host, paths.settle),
      getEndpointAuthHeaders(credentials, host, paths.supported, "GET"),
    ]);
    return { verify, settle, supported };
  };
};

/**
 * Args for {@link createCdpFacilitatorClient}.
 */
export interface CdpFacilitatorClientArgs {
  /**
   * CDP API key ID. Falls back to the `CDP_API_KEY_ID` environment variable.
   */
  apiKeyId?: string;
  /**
   * CDP API key secret. Falls back to the `CDP_API_KEY_SECRET` environment variable.
   */
  apiKeySecret?: string;
  /**
   * Override the facilitator base URL. Defaults to the CDP production endpoint
   * (`https://api.cdp.coinbase.com/platform/v2/x402`).
   *
   * The hostname and per-operation paths are derived from this URL, so JWT
   * signing is automatically bound to the correct host and paths. Use this
   * to point at a staging, canary, or local facilitator without changing
   * any other configuration.
   *
   * @example
   * ```typescript
   * const facilitator = createCdpFacilitatorClient({
   *   baseUrl: "https://api.staging.cdp.coinbase.com/platform/v2/x402",
   * });
   * ```
   */
  baseUrl?: string;
}

/**
 * Creates a CDP-authenticated x402 facilitator client.
 *
 * The returned client is pre-configured with the CDP hosted facilitator URL
 * and CDP JWT-based authentication. It implements the `HTTPFacilitatorClient`
 * interface from `@x402/core/server` and can be passed directly to
 * `x402ResourceServer` as a drop-in replacement for a self-hosted facilitator.
 *
 * Credentials are resolved in order: explicit args → `CDP_API_KEY_ID` /
 * `CDP_API_KEY_SECRET` environment variables.
 *
 * @param args - Optional credential overrides.
 * @returns A configured `HTTPFacilitatorClient` ready for use with `x402ResourceServer`.
 * @throws {Error} If neither explicit args nor environment variables provide credentials.
 *
 * @example
 * Drop-in replacement for a self-hosted facilitator:
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
 * @example
 * Explicit credentials:
 * ```typescript
 * const facilitator = createCdpFacilitatorClient({
 *   apiKeyId: "my-key-id",
 *   apiKeySecret: "my-key-secret",
 * });
 * ```
 */
export function createCdpFacilitatorClient(args?: CdpFacilitatorClientArgs): HTTPFacilitatorClient {
  const apiKeyId = args?.apiKeyId ?? process.env.CDP_API_KEY_ID;
  const apiKeySecret = args?.apiKeySecret ?? process.env.CDP_API_KEY_SECRET;

  const missing: string[] = [];
  if (!apiKeyId) missing.push("CDP_API_KEY_ID");
  if (!apiKeySecret) missing.push("CDP_API_KEY_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required CDP credentials: ${missing.join(", ")}. ` +
        "Provide them via args or set the corresponding environment variables.",
    );
  }

  const credentials: FacilitatorCredentials = { apiKeyId: apiKeyId!, apiKeySecret: apiKeySecret! };

  const { url, host, paths } = resolveFacilitatorEndpoints(args?.baseUrl ?? CDP_FACILITATOR_URL);

  return new HTTPFacilitatorClient({
    url,
    createAuthHeaders: createCdpAuthHeaders(credentials, host, paths),
  });
}
