import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import axios, { AxiosInstance, AxiosHeaders } from "axios";
import { withAuth } from "./withAuth.js";
import { generateWalletJwt, generateJwt } from "../../utils/jwt.js";
import pkgJson from "../../../package.json" with { type: "json" };

const version = pkgJson.version;

// Mock the imported modules
vi.mock("../../utils/jwt");

describe("withAuth", () => {
  let axiosInstance: AxiosInstance;
  let requestInterceptorSpy: Mock;

  const mockJWT = "mock.jwt.token";
  const mockWalletAuthToken = "mock.wallet.auth.token";
  const options = {
    apiKeyId: "test-key-id",
    apiKeySecret: "test-key-secret",
    walletSecret: "test-wallet-secret",
  };

  beforeEach(() => {
    axiosInstance = axios.create();

    requestInterceptorSpy = vi.fn().mockImplementation(config => Promise.resolve(config));
    axiosInstance.interceptors.request.use = vi.fn().mockImplementation(interceptor => {
      requestInterceptorSpy = vi.fn().mockImplementation(interceptor);
      return { use: vi.fn() };
    });

    axiosInstance.request = vi.fn().mockImplementation(async config => {
      const processedConfig = await requestInterceptorSpy(config);
      return { config: processedConfig };
    });

    (generateJwt as Mock).mockResolvedValue(mockJWT);
    (generateWalletJwt as Mock).mockResolvedValue(mockWalletAuthToken);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case for successful authentication with complete request configuration
   */
  it("should correctly authenticate a request with valid configuration", async () => {
    const instance = withAuth(axiosInstance, options);

    const response = await instance.request({
      url: "https://api.example.com/v2/evm/accounts",
      method: "POST",
      headers: new AxiosHeaders(),
    });

    const processedConfig = response.config;
    expect(generateJwt).toHaveBeenCalledWith({
      apiKeyId: "test-key-id",
      apiKeySecret: "test-key-secret",
      requestMethod: "POST",
      requestHost: "api.example.com",
      requestPath: "/v2/evm/accounts",
    });

    expect(processedConfig.headers instanceof AxiosHeaders).toBe(true);
    expect(processedConfig.headers.get("Authorization")).toBe(`Bearer ${mockJWT}`);
    expect(processedConfig.headers.get("Content-Type")).toBe("application/json");
    expect(processedConfig.headers.get("X-Wallet-Auth")).toBe(mockWalletAuthToken);
  });

  it("should correctly default for the correlation context", async () => {
    const instance = withAuth(axiosInstance, options);

    const response = await instance.request({
      url: "https://api.example.com/path",
      headers: new AxiosHeaders(),
    });

    const processedConfig = response.config;
    expect(processedConfig.headers.get("Correlation-Context")).toBe(
      `sdk_version=${version},sdk_language=typescript,source=sdk-auth`,
    );
  });

  it("should correctly set the correlation context with source and source version", async () => {
    const instance = withAuth(axiosInstance, {
      ...options,
      source: "some-different-source",
      sourceVersion: "some-different-source-version",
    });

    const response = await instance.request({
      url: "https://api.example.com/path",
      headers: new AxiosHeaders(),
    });

    const processedConfig = response.config;
    expect(processedConfig.headers.get("Correlation-Context")).toBe(
      `sdk_version=${version},sdk_language=typescript,source=some-different-source,source_version=some-different-source-version`,
    );
  });

  /**
   * Test case for request with missing method
   */
  it("should default to GET method when method is undefined", async () => {
    const instance = withAuth(axiosInstance, options);

    await instance.request({
      url: "https://api.example.com/path",
      headers: new AxiosHeaders(),
    });

    expect(generateJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "GET",
      }),
    );
  });

  it("should not use wallet auth when the method is GET", async () => {
    const instance = withAuth(axiosInstance, options);

    await instance.request({
      url: "https://api.example.com/path",
      headers: new AxiosHeaders(),
    });

    expect(generateWalletJwt).not.toHaveBeenCalled();
  });

  it("should convert bigint values to strings in request data", async () => {
    const instance = withAuth(axiosInstance, options);

    const requestData = {
      wallet_id: "1234567890",
      amount: BigInt("1000000000000000000"),
      gas: BigInt("21000"),
      nested: {
        value: BigInt("500000000000000000"),
      },
      array: [BigInt("1000000000000000000"), "string", BigInt("2000000000000000000")],
    };

    const response = await instance.request({
      url: "https://api.example.com/v2/evm/accounts",
      method: "POST",
      headers: new AxiosHeaders(),
      data: requestData,
    });

    const processedConfig = response.config;

    // Verify that bigint values were converted to strings
    expect(processedConfig.data).toEqual({
      wallet_id: "1234567890",
      amount: "1000000000000000000",
      gas: "21000",
      nested: {
        value: "500000000000000000",
      },
      array: ["1000000000000000000", "string", "2000000000000000000"],
    });

    // Verify that the converted data was passed to getAuthHeaders
    expect(generateWalletJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: "POST",
        requestHost: "api.example.com",
        requestPath: "/v2/evm/accounts",
        requestData: {
          wallet_id: "1234567890",
          amount: "1000000000000000000",
          gas: "21000",
          nested: {
            value: "500000000000000000",
          },
          array: ["1000000000000000000", "string", "2000000000000000000"],
        },
      }),
    );
  });

  /**
   * Test case for handling JWT generation failure
   */
  it("should propagate JWT generation errors", async () => {
    const error = new Error("JWT Generation Failed");
    (generateJwt as Mock).mockRejectedValue(error);
    const instance = withAuth(axiosInstance, options);

    await expect(
      instance.request({
        url: "https://api.example.com/path",
        method: "POST",
        headers: new AxiosHeaders(),
      }),
    ).rejects.toThrow(error);
  });

  /**
   * Test case for handling invalid URLs
   */
  it("should throw error for invalid URLs", async () => {
    const instance = withAuth(axiosInstance, options);

    await expect(
      instance.request({
        url: "",
        method: "GET",
        headers: new AxiosHeaders(),
      }),
    ).rejects.toThrow("URL is required for authentication");
  });

  describe("debug mode", () => {
    let requestInterceptor: any;
    let responseInterceptor: any;
    let responseErrorInterceptor: any;

    beforeEach(() => {
      vi.spyOn(global.console, "log");
      vi.spyOn(global.console, "error");

      // Mock interceptors more completely
      requestInterceptor = vi.fn(config => Promise.resolve(config));
      responseInterceptor = vi.fn(response => Promise.resolve(response));
      responseErrorInterceptor = vi.fn(error => Promise.reject(error));

      // Set up the interceptors object more completely
      axiosInstance.interceptors = {
        request: {
          use: vi.fn(interceptor => {
            requestInterceptor = interceptor;
            return { use: vi.fn() };
          }),
        },
        response: {
          use: vi.fn((successInterceptor, errorInterceptor) => {
            responseInterceptor = successInterceptor;
            responseErrorInterceptor = errorInterceptor;
            return { use: vi.fn() };
          }),
        },
      };

      // Mock getUri to return a base URL
      axiosInstance.getUri = vi.fn(() => "https://api.example.com");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should log request details when debug is true", async () => {
      const instanceOptions = { ...options, debug: true };
      withAuth(axiosInstance, instanceOptions);

      const config = {
        url: "/path",
        method: "POST",
        headers: new AxiosHeaders(),
        data: { test: "data" },
      };

      await requestInterceptor(config);

      expect(global.console.log).toHaveBeenCalledWith(
        "Request:",
        expect.objectContaining({
          method: "POST",
          url: "https://api.example.com/path",
          data: { test: "data" },
          headers: expect.any(Object), // We don't need to test the exact headers here
        }),
      );
    });

    it("should log response details when debug is true", async () => {
      const instanceOptions = { ...options, debug: true };
      withAuth(axiosInstance, instanceOptions);

      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        data: { success: true },
        config: {
          url: "https://api.example.com/path",
          method: "GET",
          headers: new AxiosHeaders(),
        },
      };

      await responseInterceptor(mockResponse);

      expect(global.console.log).toHaveBeenCalledWith(
        "Response:",
        expect.objectContaining({
          status: 200,
          statusText: "OK",
          data: { success: true },
        }),
      );
    });

    it("should log error response details when debug is true", async () => {
      const instanceOptions = { ...options, debug: true };
      withAuth(axiosInstance, instanceOptions);

      const mockError = {
        response: {
          status: 400,
          statusText: "Bad Request",
          headers: new AxiosHeaders(),
          data: { error: "Invalid request" },
        },
        message: "Request failed with status code 400",
        config: {
          url: "https://api.example.com/path",
          method: "GET",
          headers: new AxiosHeaders(),
        },
        isAxiosError: true,
      };

      try {
        await responseErrorInterceptor(mockError);
      } catch (error) {
        // Expected to throw
      }

      expect(global.console.error).toHaveBeenCalledWith(
        "Response Error:",
        expect.objectContaining({
          status: 400,
          statusText: "Bad Request",
          data: { error: "Invalid request" },
          message: "Request failed with status code 400",
        }),
      );
    });

    it("should log converted bigint values in debug mode", async () => {
      const instanceOptions = { ...options, debug: true };
      withAuth(axiosInstance, instanceOptions);

      const config = {
        url: "/path",
        method: "POST",
        headers: new AxiosHeaders(),
        data: {
          amount: BigInt("1000000000000000000"),
          gas: BigInt("21000"),
        },
      };

      await requestInterceptor(config);

      expect(global.console.log).toHaveBeenCalledWith(
        "Request:",
        expect.objectContaining({
          method: "POST",
          url: "https://api.example.com/path",
          data: {
            amount: "1000000000000000000",
            gas: "21000",
          },
          headers: expect.any(Object),
        }),
      );
    });
  });
});
