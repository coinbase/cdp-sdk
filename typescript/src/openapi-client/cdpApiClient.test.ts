import { describe, it, expect, vi, beforeEach, Mocked } from "vitest";
import Axios, { AxiosInstance } from "axios";
import { configure, cdpApiClient, CdpOptions } from "./cdpApiClient.js"; // Adjust import path as needed
import { HttpErrorType } from "./errors.js";
import { withAuth } from "../auth/hooks/axios/index.js";
import { ErrorType } from "./generated/coinbaseDeveloperPlatformAPIs.schemas.js";

vi.mock("axios");
vi.mock("../auth/hooks/axios");

describe("cdpApiClient", () => {
  const defaultOptions: CdpOptions = {
    apiKeyId: "test-api-key-id",
    apiKeySecret: "test-api-key-secret",
  };
  let mockAxiosInstance: Mocked<AxiosInstance>;

  beforeEach(() => {
    vi.clearAllMocks().resetAllMocks();

    mockAxiosInstance = vi.fn().mockResolvedValue(config => {
      return Promise.resolve({ data: "mocked response" });
    }) as unknown as Mocked<AxiosInstance>;

    mockAxiosInstance.getUri = vi.fn(() => "https://api.cdp.coinbase.com/platform");

    (Axios.create as any).mockReturnValue(mockAxiosInstance);
    (Axios.isAxiosError as any) = vi.fn();

    (withAuth as any).mockImplementation(instance => instance);
  });

  describe("configure", () => {
    it("should configure the axios instance with the provided options", () => {
      configure(defaultOptions);

      expect(Axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.cdp.coinbase.com/platform",
      });

      expect(withAuth).toHaveBeenCalledWith(mockAxiosInstance, {
        apiKeyId: defaultOptions.apiKeyId,
        apiKeySecret: defaultOptions.apiKeySecret,
        source: "sdk-openapi-client",
        sourceVersion: undefined,
        walletSecret: undefined,
        expiresIn: undefined,
        debug: undefined,
      });
    });

    it("should use custom basePath if provided", () => {
      const options = { ...defaultOptions, basePath: "https://custom.api.url" };
      configure(options);

      expect(Axios.create).toHaveBeenCalledWith({
        baseURL: "https://custom.api.url",
      });
    });

    it("should enable debugging if requested", () => {
      const options = { ...defaultOptions, debugging: true };
      configure(options);

      expect(withAuth).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          debug: true,
        }),
      );
    });

    it("should use provided source and sourceVersion", () => {
      const options = {
        ...defaultOptions,
        source: "custom-source",
        sourceVersion: "1.0.0",
      };
      configure(options);

      expect(withAuth).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          source: "custom-source",
          sourceVersion: "1.0.0",
        }),
      );
    });

    it("should use provided walletSecret if available", () => {
      const options = {
        ...defaultOptions,
        walletSecret: "wallet-secret",
      };
      configure(options);

      expect(withAuth).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          walletSecret: "wallet-secret",
        }),
      );
    });

    it("should use provided expiresIn value", () => {
      const options = {
        ...defaultOptions,
        expiresIn: 300,
      };
      configure(options);

      expect(withAuth).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          expiresIn: 300,
        }),
      );
    });
  });

  describe("cdpApiClient mutator", () => {
    beforeEach(() => {
      configure(defaultOptions);
    });

    it("should make a successful API call and return the data", async () => {
      const responseData = { result: "success" };
      (mockAxiosInstance as any).mockResolvedValueOnce({ data: responseData });

      const result = await cdpApiClient({
        url: "/test-endpoint",
        method: "GET",
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: "/test-endpoint",
        method: "GET",
      });
      expect(result).toEqual(responseData);
    });

    it("should throw an error if client is not configured", async () => {
      (mockAxiosInstance as any).getUri.mockReturnValue("");

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toThrow("CDP client URI not configured. Call configure() first.");
    });

    it("should throw an error if URL is empty", async () => {
      await expect(
        cdpApiClient({
          url: "",
          method: "GET",
        }),
      ).rejects.toThrow("AxiosRequestConfig URL is empty. This should never happen.");
    });

    it("should throw an error if method is empty", async () => {
      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "",
        }),
      ).rejects.toThrow("AxiosRequestConfig method is empty. This should never happen.");
    });

    it("should handle OpenAPI errors correctly", async () => {
      const errorResponse = {
        errorType: ErrorType.invalid_request,
        errorMessage: "Invalid request.",
        correlationId: "corr-123",
      };

      const axiosError = {
        response: {
          status: 400,
          data: errorResponse,
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        name: "APIError",
        message: "Invalid request.",
        errorType: ErrorType.invalid_request,
        errorMessage: "Invalid request.",
        correlationId: "corr-123",
      });
    });

    it("should handle 401 Unauthorized error", async () => {
      const axiosError = {
        response: {
          status: 401,
          data: {},
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        errorType: HttpErrorType.unauthorized,
        errorMessage: "Unauthorized.",
      });
    });

    it("should handle 404 Not Found error", async () => {
      const axiosError = {
        response: {
          status: 404,
          data: {},
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorType: HttpErrorType.not_found,
        errorMessage: "API not found.",
      });
    });

    it("should handle 502 Bad Gateway error", async () => {
      const axiosError = {
        response: {
          status: 502,
          data: {},
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 502,
        errorType: HttpErrorType.bad_gateway,
        errorMessage: "Bad gateway.",
      });
    });

    it("should handle 503 Service Unavailable error", async () => {
      const axiosError = {
        response: {
          status: 503,
          data: {},
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 503,
        errorType: HttpErrorType.service_unavailable,
        errorMessage: "Service unavailable. Please try again later.",
      });
    });

    it("should handle unexpected status code error with no response data", async () => {
      const axiosError = {
        response: {
          status: 418, // I'm a teapot
          data: null,
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 418,
        errorType: HttpErrorType.unexpected_error,
        errorMessage: "An unexpected error occurred.",
      });
    });

    it("should handle unexpected status code error with string response data", async () => {
      const axiosError = {
        response: {
          status: 418,
          data: "Custom error message from server",
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 418,
        errorType: HttpErrorType.unexpected_error,
        errorMessage: 'An unexpected error occurred: "Custom error message from server"',
      });
    });

    it("should handle unexpected status code error with object response data", async () => {
      const axiosError = {
        response: {
          status: 418,
          data: { error: "Something went wrong", code: "ERR_001" },
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 418,
        errorType: HttpErrorType.unexpected_error,
        errorMessage:
          'An unexpected error occurred: {"error":"Something went wrong","code":"ERR_001"}',
      });
    });

    it("should handle unexpected status code error with circular reference in response data", async () => {
      // Create object with circular reference
      const circularObj: any = { error: "test error" };
      circularObj.self = circularObj;

      const axiosError = {
        response: {
          status: 418,
          data: circularObj,
        },
        request: {},
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toMatchObject({
        statusCode: 418,
        errorType: HttpErrorType.unexpected_error,
        errorMessage: "An unexpected error occurred: [object Object]",
      });
    });

    it("should handle network error with no response by rethrowing the error", async () => {
      const axiosError = {
        request: {},
        response: undefined,
        isAxiosError: true,
      };

      (mockAxiosInstance as any).mockRejectedValueOnce(axiosError);
      (Axios.isAxiosError as any).mockReturnValue(true);
      await expect(() =>
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`[UnknownApiError]`);
    });

    it("should handle non-Axios errors by rethrowing the error", async () => {
      const error = new Error("Something random went wrong.");

      (mockAxiosInstance as any).mockRejectedValueOnce(error);
      (Axios.isAxiosError as any).mockReturnValue(false);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[UnknownError: Something went wrong. Please reach out at https://discord.com/channels/1220414409550336183/1271495764580896789 for help.]`,
      );
    });

    it("should handle non-Error objects", async () => {
      const error = "Just a string error";

      (mockAxiosInstance as any).mockRejectedValueOnce(error);
      (Axios.isAxiosError as any).mockReturnValue(false);

      await expect(
        cdpApiClient({
          url: "/test-endpoint",
          method: "GET",
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[UnknownError: Something went wrong. Please reach out at https://discord.com/channels/1220414409550336183/1271495764580896789 for help.]`,
      );
    });

    it("should include idempotency key when provided", async () => {
      const responseData = { result: "success" };
      (mockAxiosInstance as any).mockResolvedValueOnce({ data: responseData });

      const idempotencyKey = "test-idempotency-key-123";

      const result = await cdpApiClient(
        {
          url: "/test-endpoint",
          method: "POST",
        },
        idempotencyKey,
      );

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: "/test-endpoint",
        method: "POST",
        headers: {
          "X-Idempotency-Key": idempotencyKey,
        },
      });
      expect(result).toEqual(responseData);
    });
  });
});
