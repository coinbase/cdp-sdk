import {
  Error as OpenAPIError,
  ErrorType as OpenAPIErrorType,
} from "./generated/coinbaseDeveloperPlatformAPIs.schemas.js";

export const HttpErrorType = {
  unexpected_error: "unexpected_error",
  unauthorized: "unauthorized",
  not_found: "not_found",
  bad_gateway: "bad_gateway",
  service_unavailable: "service_unavailable",
  unknown: "unknown",
} as const;

export type HttpErrorType = (typeof HttpErrorType)[keyof typeof HttpErrorType];

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
    cause?: Error,
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
