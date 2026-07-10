/**
 * @module HTTP
 */

import { generateWalletJwt, generateJwt } from "./jwt.js";
import { UserInputValidationError } from "../../errors.js";
import { isPublicOperation } from "../../openapi-client/publicOperations.gen.js";
import { version } from "../../version.js";

/**
 * Options for generating authentication headers for API requests.
 */
export interface GetAuthHeadersOptions {
  /**
   * The API key ID
   *
   * Examples:
   *  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   *  'organizations/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/apiKeys/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   *
   * Not required to call public (unauthenticated) endpoints. See `isPublicOperation`.
   */
  apiKeyId?: string;

  /**
   * The API key secret
   *
   * Examples:
   *  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==' (Edwards key (Ed25519))
   *  '-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n' (EC key (ES256))
   *
   * Not required to call public (unauthenticated) endpoints. See `isPublicOperation`.
   */
  apiKeySecret?: string;

  /**
   * The HTTP method for the request (e.g. 'GET', 'POST')
   */
  requestMethod: string;

  /**
   * The host for the request (e.g. 'api.cdp.coinbase.com')
   */
  requestHost: string;

  /**
   * The path for the request (e.g. '/platform/v1/wallets')
   */
  requestPath: string;

  /**
   * Optional request body data
   */
  requestBody?: unknown;

  /**
   * The Wallet Secret for wallet authentication
   */
  walletSecret?: string;

  /**
   * The source identifier for the request
   */
  source?: string;

  /**
   * The version of the source making the request
   */
  sourceVersion?: string;

  /**
   * Optional expiration time in seconds (defaults to 120)
   */
  expiresIn?: number;

  /**
   * Optional audience claim for the JWT
   */
  audience?: string[];
}

/**
 * Gets authentication headers for a request.
 *
 * @param options - The configuration options for generating auth headers
 * @returns Object containing the authentication headers
 */
export async function getAuthHeaders(
  options: GetAuthHeadersOptions,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  /*
   * Content-Type describes the request body, not authentication, so set it for all requests
   * (including public/unauthenticated operations).
   */
  headers["Content-Type"] = "application/json";

  const hasCredentials = Boolean(options.apiKeyId && options.apiKeySecret);

  if (!hasCredentials && !isPublicOperation(options.requestMethod, options.requestPath)) {
    throw new UserInputValidationError(
      "Missing required CDP API Key configuration. Please set the CDP_API_KEY_ID and CDP_API_KEY_SECRET environment variables, or pass them as options to the CdpClient constructor.",
    );
  }

  /*
   * Send the bearer token whenever credentials are available, even for public operations.
   * This lets the server distinguish an authenticated caller from an anonymous one.
   */
  if (hasCredentials) {
    const jwt = await generateJwt({
      apiKeyId: options.apiKeyId!,
      apiKeySecret: options.apiKeySecret!,
      requestMethod: options.requestMethod,
      requestHost: options.requestHost,
      requestPath: options.requestPath,
      expiresIn: options.expiresIn,
      audience: options.audience,
    });
    headers["Authorization"] = `Bearer ${jwt}`;

    // Add wallet auth if needed
    if (requiresWalletAuth(options.requestMethod, options.requestPath)) {
      if (!options.walletSecret) {
        throw new UserInputValidationError(
          "Wallet Secret not configured. Please set the CDP_WALLET_SECRET environment variable, or pass it as an option to the CdpClient constructor.",
        );
      }

      const walletAuthToken = await generateWalletJwt({
        walletSecret: options.walletSecret,
        requestMethod: options.requestMethod,
        requestHost: options.requestHost,
        requestPath: options.requestPath,
        requestData: options.requestBody || {},
      });
      headers["X-Wallet-Auth"] = walletAuthToken;
    }
  }

  // Add correlation data
  headers["Correlation-Context"] = getCorrelationData(options.source, options.sourceVersion);

  return headers;
}

/**
 * Returns true if the request indicated by the method and URL requires wallet authentication.
 *
 * @param requestMethod - The HTTP method of the request
 * @param requestPath - The URL path of the request
 * @returns True if the request requires wallet authentication, false otherwise
 */
function requiresWalletAuth(requestMethod: string, requestPath: string): boolean {
  return (
    /*
     * Match the wallet account endpoints (/v2/evm/accounts, /v2/solana/accounts)
     * but NOT the custodial /v2/accounts endpoint, which authenticates with the
     * API key alone (see openapi.yaml: POST /v2/accounts declares apiKeyAuth and
     * no X-Wallet-Auth parameter). A bare includes("/accounts") over-matched it.
     */
    (/\/(evm|solana)\/accounts/.test(requestPath ?? "") ||
      requestPath?.includes("/spend-permissions") ||
      requestPath?.includes("/user-operations/prepare-and-send") ||
      requestPath?.includes("/embedded-wallet-api/") ||
      requestPath?.endsWith("/end-users") ||
      requestPath?.endsWith("/end-users/import") ||
      /\/end-users\/[^/]+\/evm$/.test(requestPath) ||
      /\/end-users\/[^/]+\/evm-smart-account$/.test(requestPath) ||
      /\/end-users\/[^/]+\/solana$/.test(requestPath)) &&
    (requestMethod === "POST" || requestMethod === "DELETE" || requestMethod === "PUT")
  );
}

/**
 * Returns encoded correlation data including the SDK version and language.
 *
 * @param source - The source identifier for the request
 * @param sourceVersion - The version of the source making the request
 * @returns Encoded correlation data as a query string
 */
export function getCorrelationData(source?: string, sourceVersion?: string): string {
  const data: Record<string, string> = {
    sdk_version: version,
    sdk_language: "typescript",
    source: source || "sdk-auth",
  };
  if (sourceVersion) {
    data["source_version"] = sourceVersion;
  }
  return Object.keys(data)
    .map(key => `${key}=${encodeURIComponent(data[key])}`)
    .join(",");
}
