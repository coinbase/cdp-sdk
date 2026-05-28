// eslint-disable-next-line import/no-named-as-default
import Axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";

import { withAuth } from "../auth/hooks/axios/index.js";
import { ERROR_DOCS_PAGE_URL } from "../constants.js";
import { isOpenAPIError, APIError, UnknownError, NetworkError } from "./errors.js";
import { UserInputValidationError } from "../errors.js";

import type { Prettify } from "../types/utils.js";

/**
 * The options for the CDP API.
 */
export type CdpOptions = {
  /**
   * The API key ID or the legacy API key name.
   *
   * Examples:
   *  ID format: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   *  Legacy name format: 'organizations/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/apiKeys/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   */
  apiKeyId: string;

  /**
   * The API key secret, using the Ed25519 or legacy EC key format.
   *
   * Examples:
   *  Ed25519 key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=='
   *  EC key: '-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n'
   */
  apiKeySecret: string;

  /** The Wallet Secret. Only needed if calling certain Wallet APIs. */
  walletSecret?: string;

  /** If true, logs API requests and responses to the console. */
  debugging?: boolean;

  /** The base path for the API. */
  basePath?: string;

  /** The source for the API request, used for analytics. Defaults to `typescript-client`. */
  source?: string;

  /** The version of the source for the API request, used for analytics. */
  sourceVersion?: string;

  /** Optional expiration time in seconds (defaults to 120) */
  expiresIn?: number;
};

let axiosInstance: AxiosInstance;

export let config: Prettify<Omit<CdpOptions, "basePath"> & { basePath: string }> | undefined =
  undefined;

/**
 * Configures the CDP client with the given options.
 *
 * @param {CdpOptions} options - The CDP options.
 */
export const configure = (options: CdpOptions) => {
  const baseURL = options.basePath || "https://api.cdp.coinbase.com/platform";

  config = {
    ...options,
    basePath: baseURL,
  };

  axiosInstance = Axios.create({
    baseURL,
  });

  axiosRetry(axiosInstance, {
    retryDelay: exponentialDelay,
  });

  axiosInstance = withAuth(axiosInstance, {
    apiKeyId: options.apiKeyId,
    apiKeySecret: options.apiKeySecret,
    source: options.source || "sdk-openapi-client",
    sourceVersion: options.sourceVersion,
    walletSecret: options.walletSecret,
    expiresIn: options.expiresIn,
    debug: options.debugging,
  });
};

/**
 * Adds an idempotency key to request config if provided
 *
 * @param config - The Axios request configuration.
 * @param idempotencyKey - The idempotency key.
 * @returns The Axios request configuration with the idempotency key.
 */
const addIdempotencyKey = (
  config: AxiosRequestConfig,
  idempotencyKey?: string,
): AxiosRequestConfig => {
  if (!idempotencyKey) {
    return config;
  }

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      "X-Idempotency-Key": idempotencyKey,
    },
  };
};

/**
 * Mutates the given Axios request configuration to add the CDP API key signature
 * to the request headers.
 *
 * @param {AxiosRequestConfig} config - The Axios request configuration.
 * @param idempotencyKey - The idempotency key.
 * @returns {Promise<T>} A promise that resolves to the response data.
 * @throws {APIError} If the request fails.
 */
export const cdpApiClient = async <T>(
  config: AxiosRequestConfig,
  idempotencyKey?: string,
): Promise<T> => {
  validateCall(config);

  // Add idempotency key to the request headers if provided
  const configWithIdempotencyKey = addIdempotencyKey(config, idempotencyKey);

  try {
    const response = await axiosInstance(configWithIdempotencyKey);
    return response.data as T;
  } catch (error) {
    if (error instanceof UserInputValidationError) {
      throw error;
    }

    // eslint-disable-next-line import/no-named-as-default-member
    if (Axios.isAxiosError(error) && !error.response) {
      // Network-level errors (no response received)
      const errorMessage = (error.message || "").toLowerCase();
      const errorCode = error.code?.toLowerCase();

      // Categorize network errors based on error messages and codes
      if (errorCode === "econnrefused" || errorMessage.includes("connection refused")) {
        throw new NetworkError(
          "network_connection_failed",
          "Unable to connect to CDP service. The service may be unavailable.",
          { code: error.code, message: error.message, retryable: true },
          error.cause,
        );
      } else if (
        errorCode === "etimedout" ||
        errorCode === "econnaborted" ||
        errorMessage.includes("timeout")
      ) {
        throw new NetworkError(
          "network_timeout",
          "Request timed out. Please try again.",
          { code: error.code, message: error.message, retryable: true },
          error.cause,
        );
      } else if (errorCode === "enotfound" || errorMessage.includes("getaddrinfo")) {
        throw new NetworkError(
          "network_dns_failure",
          "DNS resolution failed. Please check your network connection.",
          { code: error.code, message: error.message, retryable: false },
          error.cause,
        );
      } else if (errorMessage.includes("network error") || errorMessage.includes("econnreset")) {
        throw new NetworkError(
          "network_connection_failed",
          "Network error occurred. Please check your connection and try again.",
          { code: error.code, message: error.message, retryable: true },
          error.cause,
        );
      } else {
        // Generic network error
        throw new NetworkError(
          "unknown",
          error.cause instanceof Error ? error.cause.message : error.message,
          { code: error.code, message: error.message, retryable: true },
          error.cause,
        );
      }
    }

    // eslint-disable-next-line import/no-named-as-default-member
    if (Axios.isAxiosError(error) && error.response) {
      if (isOpenAPIError(error.response.data)) {
        throw new APIError(
          error.response.status,
          error.response.data.errorType,
          error.response.data.errorMessage,
          error.response.data.correlationId,
          error.response.data.errorLink,
          error.cause,
        );
      } else {
        const statusCode = error.response.status;
        const responseData = error.response.data;

        // Check for gateway-level errors that might indicate network issues
        const isGatewayError =
          responseData &&
          typeof responseData === "string" &&
          (responseData.toLowerCase().includes("forbidden") ||
            responseData.toLowerCase().includes("ip") ||
            responseData.toLowerCase().includes("blocked") ||
            responseData.toLowerCase().includes("gateway"));

        switch (statusCode) {
          case 401:
            throw new APIError(
              statusCode,
              "unauthorized",
              "Unauthorized.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}#unauthorized`,
              error.cause,
            );
          case 403:
            // Special handling for IP blocklist and other gateway-level 403s
            if (isGatewayError) {
              throw new NetworkError(
                "network_ip_blocked",
                "Access denied. Your IP address may be blocked or restricted.",
                {
                  code: "IP_BLOCKED",
                  message:
                    typeof responseData === "string" ? responseData : JSON.stringify(responseData),
                  retryable: false,
                },
                error.cause,
              );
            }
            // Regular 403 forbidden error
            throw new APIError(
              statusCode,
              "unauthorized",
              "Forbidden. You don't have permission to access this resource.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}#forbidden`,
              error.cause,
            );
          case 404:
            throw new APIError(
              statusCode,
              "not_found",
              "API not found.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}#not_found`,
              error.cause,
            );
          case 502:
            throw new APIError(
              statusCode,
              "bad_gateway",
              "Bad gateway.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}`,
              error.cause,
            );
          case 503:
            throw new APIError(
              statusCode,
              "service_unavailable",
              "Service unavailable. Please try again later.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}`,
              error.cause,
            );
          default: {
            let errorText = "";

            if (error.response.data) {
              try {
                errorText = JSON.stringify(error.response.data);
              } catch {
                errorText = String(error.response.data);
              }
            }

            const errorMessage = errorText
              ? `An unexpected error occurred: ${errorText}`
              : "An unexpected error occurred.";

            throw new APIError(
              statusCode,
              "unexpected_error",
              errorMessage,
              undefined,
              `${ERROR_DOCS_PAGE_URL}`,
              error.cause,
            );
          }
        }
      }
    }

    throw new UnknownError(
      "Something went wrong. Please reach out at https://discord.com/channels/1220414409550336183/1271495764580896789 for help.",
      error instanceof Error ? error : undefined,
    );
  }
};

/**
 * Validates the call to the cdpApiClient.
 *
 * @param {AxiosRequestConfig} config - The Axios request configuration.
 * @throws {Error} If the call is not valid.
 */
const validateCall = (config: AxiosRequestConfig) => {
  if (!axiosInstance.getUri() || axiosInstance.getUri() === "") {
    throw new Error("CDP client URI not configured. Call configure() first.");
  }

  if (!config.url || config.url === "") {
    throw new Error("AxiosRequestConfig URL is empty. This should never happen.");
  }

  if (!config.method || config.method === "") {
    throw new Error("AxiosRequestConfig method is empty. This should never happen.");
  }
};
