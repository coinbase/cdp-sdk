// eslint-disable-next-line import/no-named-as-default
import Axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { withAuth } from "../auth/hooks/axios/index.js";
import { ERROR_DOCS_PAGE_URL } from "../constants.js";
import {
  isOpenAPIError,
  APIError,
  HttpErrorType,
  UnknownApiError,
  UnknownError,
} from "./errors.js";

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

/**
 * Configures the CDP client with the given options.
 *
 * @param {CdpOptions} options - The CDP options.
 */
export const configure = (options: CdpOptions) => {
  axiosInstance = Axios.create({
    baseURL: options.basePath || "https://api.cdp.coinbase.com/platform",
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
    // eslint-disable-next-line import/no-named-as-default-member
    if (Axios.isAxiosError(error) && !error.response) {
      throw new UnknownApiError(
        HttpErrorType.unknown,
        error.cause instanceof Error ? error.cause.message : error.message,
        error.cause,
      );
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
        switch (statusCode) {
          case 401:
            throw new APIError(
              statusCode,
              HttpErrorType.unauthorized,
              "Unauthorized.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}#unauthorized`,
              error.cause,
            );
          case 404:
            throw new APIError(
              statusCode,
              HttpErrorType.not_found,
              "API not found.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}#not_found`,
              error.cause,
            );
          case 502:
            throw new APIError(
              statusCode,
              HttpErrorType.bad_gateway,
              "Bad gateway.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}`,
              error.cause,
            );
          case 503:
            throw new APIError(
              statusCode,
              HttpErrorType.service_unavailable,
              "Service unavailable. Please try again later.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}`,
              error.cause,
            );
          default:
            throw new APIError(
              statusCode,
              HttpErrorType.unexpected_error,
              "An unexpected error occurred.",
              undefined,
              `${ERROR_DOCS_PAGE_URL}`,
              error.cause,
            );
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
