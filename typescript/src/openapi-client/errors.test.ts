import { describe, it, expect } from "vitest";
import { APIError, HttpErrorType, isOpenAPIError } from "./errors.js";
import {
  Error as OpenAPIError,
  ErrorType as OpenAPIErrorType,
} from "./generated/coinbaseDeveloperPlatformAPIs.schemas.js";

describe("Errors", () => {
  describe("APIError", () => {
    it("should create an instance with the correct properties", () => {
      const statusCode = 404;
      const errorType = HttpErrorType.not_found;
      const errorMessage = "Resource not found";
      const correlationId = "abc-123-xyz";

      const error = new APIError(statusCode, errorType, errorMessage, correlationId);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(APIError);
      expect(error.name).toBe("APIError");
      expect(error.statusCode).toBe(statusCode);
      expect(error.errorType).toBe(errorType);
      expect(error.errorMessage).toBe(errorMessage);
      expect(error.correlationId).toBe(correlationId);
      expect(error.message).toBe(errorMessage);
    });

    it("should create an instance without correlationId", () => {
      const statusCode = 500;
      const errorType = HttpErrorType.unexpected_error;
      const errorMessage = "Something went wrong";

      const error = new APIError(statusCode, errorType, errorMessage);

      expect(error.correlationId).toBeUndefined();
    });

    it("should work with OpenAPI error types", () => {
      const statusCode = 400;
      const errorType = OpenAPIErrorType.rate_limit_exceeded;
      const errorMessage = "Invalid input";

      const error = new APIError(statusCode, errorType, errorMessage);

      expect(error.errorType).toBe(errorType);
    });
  });

  describe("HttpErrorType", () => {
    it("should have the expected error types", () => {
      expect(HttpErrorType.unexpected_error).toBe("unexpected_error");
      expect(HttpErrorType.unauthorized).toBe("unauthorized");
      expect(HttpErrorType.not_found).toBe("not_found");
      expect(HttpErrorType.bad_gateway).toBe("bad_gateway");
      expect(HttpErrorType.service_unavailable).toBe("service_unavailable");
    });
  });

  describe("isOpenAPIError", () => {
    it("should return true for valid OpenAPIError objects", () => {
      const openAPIError: OpenAPIError = {
        errorType: OpenAPIErrorType.rate_limit_exceeded,
        errorMessage: "Rate limit exceeded",
      };

      expect(isOpenAPIError(openAPIError)).toBe(true);
    });

    it("should return false for null values", () => {
      expect(isOpenAPIError(null)).toBe(false);
    });

    it("should return false for non-object values", () => {
      expect(isOpenAPIError("string")).toBe(false);
      expect(isOpenAPIError(123)).toBe(false);
      expect(isOpenAPIError(undefined)).toBe(false);
      expect(isOpenAPIError(true)).toBe(false);
    });

    it("should return false for objects missing required properties", () => {
      expect(isOpenAPIError({})).toBe(false);
      expect(isOpenAPIError({ errorType: OpenAPIErrorType.rate_limit_exceeded })).toBe(false);
      expect(isOpenAPIError({ errorMessage: "Rate limit exceeded" })).toBe(false);
    });

    it("should return false for objects with wrong property types", () => {
      expect(isOpenAPIError({ errorType: 123, errorMessage: "Invalid input" })).toBe(false);
      expect(isOpenAPIError({ errorType: "validation_error", errorMessage: 123 })).toBe(false);
    });

    it("should return true for objects with additional properties", () => {
      const openAPIError = {
        errorType: "validation_error",
        errorMessage: "Invalid input",
        extraProperty: "some value",
      };

      expect(isOpenAPIError(openAPIError)).toBe(true);
    });
  });
});
