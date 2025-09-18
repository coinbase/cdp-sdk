import { ERROR_DOCS_PAGE_URL } from "../constants.js";
import {
  Error as OpenAPIError,
  ErrorType as OpenAPIErrorType,
} from "./generated/coinbaseDeveloperPlatformAPIs.schemas.js";

export type HttpErrorType =
  | "unexpected_error"
  | "unauthorized"
  | "not_found"
  | "bad_gateway"
  | "service_unavailable"
  | "unknown"
  | "network_timeout"
  | "network_connection_failed"
  | "network_ip_blocked"
  | "network_dns_failure";

/**
 * Extended error codes that include both OpenAPI errors and network errors
 */
export type APIErrorType = OpenAPIErrorType | HttpErrorType;

/**
 * Extended API error that encompasses both OpenAPI errors and other API-related errors
 */
export class APIError extends Error {
  statusCode: number;
  errorType: APIErrorType;
  errorMessage: string;
  correlationId?: string;
  errorLink?: string;

  /**
   * Constructor for the APIError class
   *
   * @param statusCode - The HTTP status code
   * @param errorType - The type of error
   * @param errorMessage - The error message
   * @param correlationId - The correlation ID
   * @param errorLink - URL to documentation about this error
   * @param cause - The cause of the error
   */
  constructor(
    statusCode: number,
    errorType: APIErrorType,
    errorMessage: string,
    correlationId?: string,
    errorLink?: string,
    cause?: Error | unknown,
  ) {
    super(errorMessage, { cause });
    this.name = "APIError";
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.errorMessage = errorMessage;

    // Only set correlationId if it's defined
    if (correlationId !== undefined) {
      this.correlationId = correlationId;
    }

    // Only set errorLink if it's defined
    if (errorLink !== undefined) {
      this.errorLink = errorLink;
    }
  }

  /**
   * Convert the error to a JSON object, excluding undefined properties
   *
   * @returns The error as a JSON object
   */
  toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      errorType: this.errorType,
      errorMessage: this.errorMessage,
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...(this.errorLink && { errorLink: this.errorLink }),
    };
  }
}

/**
 * Error thrown when an Axios request is made but no response is received
 */
export class UnknownApiError extends APIError {
  /**
   * Constructor for the UnknownApiError class
   *
   * @param errorType - The type of error
   * @param errorMessage - The error message
   * @param cause - The cause of the error
   */
  constructor(errorType: APIErrorType, errorMessage: string, cause?: Error) {
    super(0, errorType, errorMessage, undefined, undefined, cause);
    this.name = "UnknownApiError";
  }
}

/**
 * Error thrown when an error is not known
 */
export class UnknownError extends Error {
  /**
   * Constructor for the UnknownError class
   *
   * @param message - The error message
   * @param cause - The cause of the error
   */
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = "UnknownError";
  }
}

/**
 * Error thrown when a network-level failure occurs before reaching the CDP service
 * This includes gateway errors, IP blocklist rejections, DNS failures, etc.
 */
export class NetworkError extends APIError {
  networkDetails?: {
    code?: string;
    message?: string;
    retryable?: boolean;
  };

  /**
   * Constructor for the NetworkError class
   *
   * @param errorType - The type of network error
   * @param errorMessage - The error message
   * @param networkDetails - Additional network error details
   * @param networkDetails.code - The error code
   * @param networkDetails.message - The error message
   * @param networkDetails.retryable - Whether the error is retryable
   * @param cause - The cause of the error
   */
  constructor(
    errorType: HttpErrorType,
    errorMessage: string,
    networkDetails?: { code?: string; message?: string; retryable?: boolean },
    cause?: Error | unknown,
  ) {
    super(
      0, // Status code 0 indicates no response was received
      errorType,
      errorMessage,
      undefined,
      `${ERROR_DOCS_PAGE_URL}#network-errors`,
      cause,
    );
    this.name = "NetworkError";
    this.networkDetails = networkDetails;
  }

  /**
   * Convert the error to a JSON object, including network details
   *
   * @returns The error as a JSON object
   */
  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.networkDetails && { networkDetails: this.networkDetails }),
    };
  }
}

/**
 * Type guard to check if an object is an OpenAPIError
 *
 * @param obj - The object to check
 * @returns True if the object is an OpenAPIError
 */
export function isOpenAPIError(obj: unknown): obj is OpenAPIError {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "errorType" in obj &&
    typeof (obj as OpenAPIError).errorType === "string" &&
    "errorMessage" in obj &&
    typeof (obj as OpenAPIError).errorMessage === "string"
  );
}
