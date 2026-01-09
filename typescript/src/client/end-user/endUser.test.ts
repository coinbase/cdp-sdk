import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import { CdpOpenApiClient } from "../../openapi-client";

import { CDPEndUserClient } from "./endUser.js";
import type {
  ValidateAccessTokenOptions,
  ListEndUsersOptions,
  CreateEndUserOptions,
  ImportEndUserOptions,
  GetEndUserOptions,
} from "./endUser.types.js";
import { APIError } from "../../openapi-client/errors.js";
import { UserInputValidationError } from "../../errors.js";

// Mock crypto.randomUUID and publicEncrypt to return predictable values in tests.
const mockRandomUUID = vi.fn();
const mockPublicEncrypt = vi.fn();
vi.mock("crypto", () => ({
  randomUUID: () => mockRandomUUID(),
  publicEncrypt: (...args: unknown[]) => mockPublicEncrypt(...args),
  constants: {
    RSA_PKCS1_OAEP_PADDING: 4,
  },
}));

vi.mock("../../openapi-client", () => {
  return {
    CdpOpenApiClient: {
      createEndUser: vi.fn(),
      validateEndUserAccessToken: vi.fn(),
      listEndUsers: vi.fn(),
      getEndUser: vi.fn(),
      importEndUser: vi.fn(),
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
    evmAccountObjects: [{ address: "0x123", createdAt: "2024-01-01T00:00:00Z" }],
    evmSmartAccountObjects: [
      { address: "0x123", ownerAddresses: ["0x456"], createdAt: "2024-01-01T00:00:00Z" },
    ],
    solanaAccountObjects: [{ address: "test123", createdAt: "2024-01-01T00:00:00Z" }],
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
    mockPublicEncrypt.mockReturnValue(Buffer.from("encrypted-private-key"));
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

    it("should create an end user with evmAccount and enableSpendPermissions option", async () => {
      const createOptions: CreateEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        evmAccount: { createSmartAccount: true, enableSpendPermissions: true },
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);

      await client.createEndUser(createOptions);

      expect(CdpOpenApiClient.createEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        evmAccount: { createSmartAccount: true, enableSpendPermissions: true },
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

  describe("getEndUser", () => {
    it("should get an end user by userId", async () => {
      const getOptions: GetEndUserOptions = {
        userId: "test-user-id",
      };
      (
        CdpOpenApiClient.getEndUser as MockedFunction<typeof CdpOpenApiClient.getEndUser>
      ).mockResolvedValue(mockEndUser);

      const result = await client.getEndUser(getOptions);

      expect(CdpOpenApiClient.getEndUser).toHaveBeenCalledWith("test-user-id");
      expect(result).toEqual(mockEndUser);
    });

    it("should handle errors when getting an end user", async () => {
      const getOptions: GetEndUserOptions = {
        userId: "non-existent-user-id",
      };
      const expectedError = new APIError(404, "not_found", "End user not found");
      (
        CdpOpenApiClient.getEndUser as MockedFunction<typeof CdpOpenApiClient.getEndUser>
      ).mockRejectedValue(expectedError);

      await expect(client.getEndUser(getOptions)).rejects.toThrow(expectedError);
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

  describe("importEndUser", () => {
    it("should import an end user with EVM private key (with 0x prefix)", async () => {
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        keyType: "evm",
      };
      (
        CdpOpenApiClient.importEndUser as MockedFunction<typeof CdpOpenApiClient.importEndUser>
      ).mockResolvedValue(mockEndUser);

      const result = await client.importEndUser(importOptions);

      expect(CdpOpenApiClient.importEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        encryptedPrivateKey: Buffer.from("encrypted-private-key").toString("base64"),
        keyType: "evm",
      });
      expect(result).toEqual(mockEndUser);
    });

    it("should import an end user with EVM private key (without 0x prefix)", async () => {
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        keyType: "evm",
      };
      (
        CdpOpenApiClient.importEndUser as MockedFunction<typeof CdpOpenApiClient.importEndUser>
      ).mockResolvedValue(mockEndUser);

      const result = await client.importEndUser(importOptions);

      expect(CdpOpenApiClient.importEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        encryptedPrivateKey: Buffer.from("encrypted-private-key").toString("base64"),
        keyType: "evm",
      });
      expect(result).toEqual(mockEndUser);
    });

    it("should import an end user with provided userId", async () => {
      const importOptions: ImportEndUserOptions = {
        userId: "custom-user-id",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        keyType: "evm",
      };
      (
        CdpOpenApiClient.importEndUser as MockedFunction<typeof CdpOpenApiClient.importEndUser>
      ).mockResolvedValue({ ...mockEndUser, userId: "custom-user-id" });

      const result = await client.importEndUser(importOptions);

      expect(CdpOpenApiClient.importEndUser).toHaveBeenCalledWith({
        userId: "custom-user-id",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        encryptedPrivateKey: Buffer.from("encrypted-private-key").toString("base64"),
        keyType: "evm",
      });
      expect(result.userId).toBe("custom-user-id");
    });

    it("should import an end user with Solana private key (base58 string)", async () => {
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: "3Kzjw8qSxx8bQkV7EHrVFWYiPyNLbBVxtVe1Q5h2zKZY",
        keyType: "solana",
      };
      (
        CdpOpenApiClient.importEndUser as MockedFunction<typeof CdpOpenApiClient.importEndUser>
      ).mockResolvedValue(mockEndUser);

      const result = await client.importEndUser(importOptions);

      expect(CdpOpenApiClient.importEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        encryptedPrivateKey: Buffer.from("encrypted-private-key").toString("base64"),
        keyType: "solana",
      });
      expect(result).toEqual(mockEndUser);
    });

    it("should import an end user with Solana private key (32-byte Uint8Array)", async () => {
      const privateKeyBytes = new Uint8Array(32).fill(1);
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: privateKeyBytes,
        keyType: "solana",
      };
      (
        CdpOpenApiClient.importEndUser as MockedFunction<typeof CdpOpenApiClient.importEndUser>
      ).mockResolvedValue(mockEndUser);

      const result = await client.importEndUser(importOptions);

      expect(CdpOpenApiClient.importEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        encryptedPrivateKey: Buffer.from("encrypted-private-key").toString("base64"),
        keyType: "solana",
      });
      expect(result).toEqual(mockEndUser);
    });

    it("should import an end user with Solana private key (64-byte Uint8Array, truncates to 32)", async () => {
      const privateKeyBytes = new Uint8Array(64).fill(1);
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: privateKeyBytes,
        keyType: "solana",
      };
      (
        CdpOpenApiClient.importEndUser as MockedFunction<typeof CdpOpenApiClient.importEndUser>
      ).mockResolvedValue(mockEndUser);

      const result = await client.importEndUser(importOptions);

      // Verify the encryption was called with a 32-byte key (truncated from 64)
      expect(mockPublicEncrypt).toHaveBeenCalled();
      const encryptedData = mockPublicEncrypt.mock.calls[0][1];
      expect(encryptedData.length).toBe(32);

      expect(CdpOpenApiClient.importEndUser).toHaveBeenCalledWith({
        userId: "generated-uuid",
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        encryptedPrivateKey: Buffer.from("encrypted-private-key").toString("base64"),
        keyType: "solana",
      });
      expect(result).toEqual(mockEndUser);
    });

    it("should throw error for EVM private key that is not a string", async () => {
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: new Uint8Array(32) as unknown as string,
        keyType: "evm",
      };

      await expect(client.importEndUser(importOptions)).rejects.toThrow(UserInputValidationError);
      await expect(client.importEndUser(importOptions)).rejects.toThrow(
        "EVM private key must be a hex string",
      );
    });

    it("should throw error for EVM private key that is not valid hex", async () => {
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: "0xGGGGGGGGGGGGGGGG",
        keyType: "evm",
      };

      await expect(client.importEndUser(importOptions)).rejects.toThrow(UserInputValidationError);
      await expect(client.importEndUser(importOptions)).rejects.toThrow(
        "Private key must be a valid hexadecimal string",
      );
    });

    it("should throw error for Solana private key with invalid length", async () => {
      const privateKeyBytes = new Uint8Array(16).fill(1); // Invalid length
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: privateKeyBytes,
        keyType: "solana",
      };

      await expect(client.importEndUser(importOptions)).rejects.toThrow(UserInputValidationError);
      await expect(client.importEndUser(importOptions)).rejects.toThrow(
        "Invalid Solana private key length",
      );
    });

    it("should handle API errors when importing an end user", async () => {
      const importOptions: ImportEndUserOptions = {
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
        privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        keyType: "evm",
      };
      const expectedError = new APIError(400, "invalid_request", "Invalid authentication method");
      (
        CdpOpenApiClient.importEndUser as MockedFunction<typeof CdpOpenApiClient.importEndUser>
      ).mockRejectedValue(expectedError);

      await expect(client.importEndUser(importOptions)).rejects.toThrow(expectedError);
    });
  });
});
