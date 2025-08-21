/**
 * @module WebSocket
 */

import { getCorrelationData } from "./http.js";
import { generateJwt } from "./jwt.js";

/**
 * Options for generating WebSocket authentication headers.
 */
export interface GetWebSocketAuthHeadersOptions {
  /**
   * The API key ID
   *
   * Examples:
   *  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   *  'organizations/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/apiKeys/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   */
  apiKeyId: string;

  /**
   * The API key secret
   *
   * Examples:
   *  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==' (Edwards key (Ed25519))
   *  '-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n' (EC key (ES256))
   */
  apiKeySecret: string;

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
 * Gets authentication headers for a WebSocket connection.
 *
 * @param options - The configuration options for generating WebSocket auth headers
 * @returns Object containing the authentication headers
 */
export async function getWebSocketAuthHeaders(
  options: GetWebSocketAuthHeadersOptions,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  // Generate and add JWT token without request parameters for WebSocket
  const jwt = await generateJwt({
    apiKeyId: options.apiKeyId,
    apiKeySecret: options.apiKeySecret,
    // All request parameters are null for WebSocket
    requestMethod: null,
    requestHost: null,
    requestPath: null,
    expiresIn: options.expiresIn,
    audience: options.audience,
  });
  headers["Authorization"] = `Bearer ${jwt}`;
  headers["Content-Type"] = "application/json";

  // Add correlation data
  headers["Correlation-Context"] = getCorrelationData(options.source, options.sourceVersion);

  return headers;
}
