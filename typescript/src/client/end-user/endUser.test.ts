import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import { CdpOpenApiClient } from "../../openapi-client";

import { CDPEndUserClient } from "./endUser.js";
import type {
  ValidateAccessTokenOptions,
  ListEndUsersOptions,
  CreateEndUserOptions,
} from "./endUser.types.js";
import { APIError } from "../../openapi-client/errors.js";

// Mock crypto.randomUUID to return predictable values in tests.
const mockRandomUUID = vi.fn();
vi.mock("crypto", () => ({
  randomUUID: () => mockRandomUUID(),
}));

vi.mock("../../openapi-client", () => {
  return {
    CdpOpenApiClient: {
      createEndUser: vi.fn(),
      validateEndUserAccessToken: vi.fn(),
      listEndUsers: vi.fn(),
    },
  };
});

describe("EndUserClient", () => {
  let client: CDPEndUserClient;
  const mockEndUser = {
    userId: "test-user-id",
    evmAccounts: ["0x123"],
    evmSmartAccounts: ["0x123"],
    solanaAccounts: ["0x123"],
    authenticationMethods: [
      {
        type: "email" as const,
        email: "test-user-email",
      },
    ],
    createdAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomUUID.mockReturnValue("generated-uuid");
    client = new CDPEndUserClient();
  });

  describe("createEndUser", () => {
    it("should create an end user with provided userId", async () => {
      const createOptions: CreateEndUserOptions = {
        userId: "custom-user-id",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue({ ...mockEndUser, userId: "custom-user-id" });

      const result = await client.createEndUser(createOptions);

      expect(CdpOpenApiClient.createEndUser).toHaveBeenCalledWith({
        userId: "custom-user-id",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });
      expect(result.userId).toBe("custom-user-id");
    });

    it("should generate a UUID if userId is not provided", async () => {
      const createOptions: CreateEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue({ ...mockEndUser, userId: "generated-uuid" });

      const result = await client.createEndUser(createOptions);

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(CdpOpenApiClient.createEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });
      expect(result.userId).toBe("generated-uuid");
    });

    it("should create an end user with evmAccount option", async () => {
      const createOptions: CreateEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        evmAccount: { createSmartAccount: true },
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);

      await client.createEndUser(createOptions);

      expect(CdpOpenApiClient.createEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        evmAccount: { createSmartAccount: true },
      });
    });

    it("should create an end user with solanaAccount option", async () => {
      const createOptions: CreateEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        solanaAccount: { createSmartAccount: false },
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);

      await client.createEndUser(createOptions);

      expect(CdpOpenApiClient.createEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        solanaAccount: { createSmartAccount: false },
      });
    });

    it("should handle errors when creating an end user", async () => {
      const createOptions: CreateEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      };
      const expectedError = new APIError(400, "invalid_request", "Invalid authentication method");
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockRejectedValue(expectedError);

      await expect(client.createEndUser(createOptions)).rejects.toThrow(expectedError);
    });
  });

  describe("validateAccessToken", () => {
    it("should validate an access token", async () => {
      const validateAccessTokenOptions: ValidateAccessTokenOptions = {
        accessToken: "test-access-token",
      };
      (
        CdpOpenApiClient.validateEndUserAccessToken as MockedFunction<
          typeof CdpOpenApiClient.validateEndUserAccessToken
        >
      ).mockResolvedValue(mockEndUser);

      const result = await client.validateAccessToken(validateAccessTokenOptions);

      expect(CdpOpenApiClient.validateEndUserAccessToken).toHaveBeenCalledWith({
        accessToken: validateAccessTokenOptions.accessToken,
      });
      expect(result).toEqual(mockEndUser);
    });

    it("return a validation error if the access token is invalid", async () => {
      const validateAccessTokenOptions: ValidateAccessTokenOptions = {
        accessToken: "test-access-token",
      };
      const expectedError = new APIError(401, "unauthorized", "Invalid access token");
      (
        CdpOpenApiClient.validateEndUserAccessToken as MockedFunction<
          typeof CdpOpenApiClient.validateEndUserAccessToken
        >
      ).mockRejectedValue(expectedError);

      await expect(client.validateAccessToken(validateAccessTokenOptions)).rejects.toThrow(
        expectedError,
      );
    });
  });

  describe("listEndUsers", () => {
    it("should list end users with default options", async () => {
      const mockListResponse = {
        endUsers: [mockEndUser],
        nextPageToken: "next-token",
      };
      (
        CdpOpenApiClient.listEndUsers as MockedFunction<typeof CdpOpenApiClient.listEndUsers>
      ).mockResolvedValue(mockListResponse);

      const result = await client.listEndUsers();

      expect(CdpOpenApiClient.listEndUsers).toHaveBeenCalledWith({});
      expect(result).toEqual(mockListResponse);
    });

    it("should list end users with pagination options", async () => {
      const listOptions: ListEndUsersOptions = {
        pageSize: 10,
        pageToken: "page-token",
      };
      const mockListResponse = {
        endUsers: [mockEndUser],
        nextPageToken: undefined,
      };
      (
        CdpOpenApiClient.listEndUsers as MockedFunction<typeof CdpOpenApiClient.listEndUsers>
      ).mockResolvedValue(mockListResponse);

      const result = await client.listEndUsers(listOptions);

      expect(CdpOpenApiClient.listEndUsers).toHaveBeenCalledWith(listOptions);
      expect(result).toEqual(mockListResponse);
    });

    it("should serialize sort parameter as comma-separated string", async () => {
      const listOptions: ListEndUsersOptions = {
        sort: ["createdAt=desc"],
      };
      const mockListResponse = {
        endUsers: [mockEndUser],
        nextPageToken: undefined,
      };
      (
        CdpOpenApiClient.listEndUsers as MockedFunction<typeof CdpOpenApiClient.listEndUsers>
      ).mockResolvedValue(mockListResponse);

      const result = await client.listEndUsers(listOptions);

      // Verify that the sort array was converted to a comma-separated string
      expect(CdpOpenApiClient.listEndUsers).toHaveBeenCalledWith({
        sort: "createdAt=desc",
      });
      expect(result).toEqual(mockListResponse);
    });

    it("should handle errors when listing end users", async () => {
      const expectedError = new APIError(500, "internal_server_error", "Internal server error");
      (
        CdpOpenApiClient.listEndUsers as MockedFunction<typeof CdpOpenApiClient.listEndUsers>
      ).mockRejectedValue(expectedError);

      await expect(client.listEndUsers()).rejects.toThrow(expectedError);
    });
  });
});
