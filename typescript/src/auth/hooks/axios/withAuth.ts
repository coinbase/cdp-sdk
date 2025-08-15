/**
 * @module Axios
 */

import { AxiosInstance, AxiosHeaders } from "axios";

import { convertBigIntsToStrings } from "../../../utils/bigint.js";
import { getAuthHeaders } from "../../utils/http.js";

export interface AuthInterceptorOptions {
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

  /** The Wallet Secret */
  walletSecret?: string;

  /** The source of the request */
  source?: string;

  /** The version of the source of the request */
  sourceVersion?: string;

  /** Optional expiration time in seconds (defaults to 120) */
  expiresIn?: number;

  /** Whether to log request/response details */
  debug?: boolean;
}

/**
 * Axios interceptor for adding the JWT to the Authorization header.
 *
 * @param axiosClient - The Axios client instance to add the interceptor to
 * @param options - Options for the request including API keys and debug flag
 * @returns The modified request configuration with the Authorization header added
 */
export function withAuth(axiosClient: AxiosInstance, options: AuthInterceptorOptions) {
  axiosClient.interceptors.request.use(async axiosConfig => {
    const method = axiosConfig.method?.toString().toUpperCase() || "GET";

    if (!axiosConfig.url) {
      throw new Error("URL is required for authentication");
    }

    const fullyQualifiedURL = axiosClient.getUri() + axiosConfig.url;

    // Parse URL to get host and path
    const url = new URL(fullyQualifiedURL);

    // Convert bigints in request body to strings for safe serialization
    if (axiosConfig.data) {
      axiosConfig.data = convertBigIntsToStrings(axiosConfig.data);
    }

    // Get authentication headers
    const headers = await getAuthHeaders({
      apiKeyId: options.apiKeyId,
      apiKeySecret: options.apiKeySecret,
      requestMethod: method,
      requestHost: url.host,
      requestPath: url.pathname,
      requestBody: axiosConfig.data,
      walletSecret: options.walletSecret,
      source: options.source,
      sourceVersion: options.sourceVersion,
      expiresIn: options.expiresIn,
    });

    // Add headers to request config
    axiosConfig.headers = new AxiosHeaders({
      ...axiosConfig.headers,
      ...headers,
    });

    if (options.debug) {
      // eslint-disable-next-line no-console
      console.log("Request:", {
        method,
        url: fullyQualifiedURL,
        headers: axiosConfig.headers,
        data: axiosConfig.data,
      });
    }

    return axiosConfig;
  });

  if (options.debug) {
    axiosClient.interceptors.response.use(
      response => {
        // eslint-disable-next-line no-console
        console.log("Response:", {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
        });
        return response;
      },
      error => {
        // Ensure we have access to the error response details
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          data: error.response?.data,
          message: error.message,
          cause: error.cause,
        };

        // eslint-disable-next-line no-console
        console.error("Response Error:", errorDetails);
        return Promise.reject(error);
      },
    );
  }

  return axiosClient;
}
