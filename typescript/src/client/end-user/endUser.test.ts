import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import { CdpOpenApiClient } from "../../openapi-client";

import { CDPEndUserClient } from "./endUser.js";
import type {
  ValidateAccessTokenOptions,
  ListEndUsersOptions,
  CreateEndUserOptions,
  ImportEndUserOptions,
  GetEndUserOptions,
  AddEndUserEvmAccountOptions,
  AddEndUserEvmSmartAccountOptions,
  AddEndUserSolanaAccountOptions,
  RevokeDelegationForEndUserOptions,
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
      addEndUserEvmAccount: vi.fn(),
      addEndUserEvmSmartAccount: vi.fn(),
      addEndUserSolanaAccount: vi.fn(),
      revokeDelegationForEndUser: vi.fn(),
      signEvmHashWithEndUserAccount: vi.fn(),
      signEvmTransactionWithEndUserAccount: vi.fn(),
      signEvmMessageWithEndUserAccount: vi.fn(),
      signEvmTypedDataWithEndUserAccount: vi.fn(),
      sendEvmTransactionWithEndUserAccount: vi.fn(),
      sendEvmAssetWithEndUserAccount: vi.fn(),
      sendUserOperationWithEndUserAccount: vi.fn(),
      createEvmEip7702DelegationWithEndUserAccount: vi.fn(),
      signSolanaHashWithEndUserAccount: vi.fn(),
      signSolanaMessageWithEndUserAccount: vi.fn(),
      signSolanaTransactionWithEndUserAccount: vi.fn(),
      sendSolanaTransactionWithEndUserAccount: vi.fn(),
      sendSolanaAssetWithEndUserAccount: vi.fn(),
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

  const testProjectId = "test-project-id";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomUUID.mockReturnValue("generated-uuid");
    mockPublicEncrypt.mockReturnValue(Buffer.from("encrypted-private-key"));
    client = new CDPEndUserClient(testProjectId);
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
      expect(result).toMatchObject(mockEndUser);
      expect(typeof result.addEvmAccount).toBe("function");
      expect(typeof result.addEvmSmartAccount).toBe("function");
      expect(typeof result.addSolanaAccount).toBe("function");
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
      expect(result).toMatchObject(mockEndUser);
      expect(typeof result.addEvmAccount).toBe("function");
      expect(typeof result.addEvmSmartAccount).toBe("function");
      expect(typeof result.addSolanaAccount).toBe("function");
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
      expect(result).toMatchObject(mockEndUser);
      expect(typeof result.addEvmAccount).toBe("function");
      expect(typeof result.addEvmSmartAccount).toBe("function");
      expect(typeof result.addSolanaAccount).toBe("function");
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
      expect(result).toMatchObject(mockEndUser);
      expect(typeof result.addEvmAccount).toBe("function");
      expect(typeof result.addEvmSmartAccount).toBe("function");
      expect(typeof result.addSolanaAccount).toBe("function");
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
      expect(result).toMatchObject(mockEndUser);
      expect(typeof result.addEvmAccount).toBe("function");
      expect(typeof result.addEvmSmartAccount).toBe("function");
      expect(typeof result.addSolanaAccount).toBe("function");
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
      expect(result).toMatchObject(mockEndUser);
      expect(typeof result.addEvmAccount).toBe("function");
      expect(typeof result.addEvmSmartAccount).toBe("function");
      expect(typeof result.addSolanaAccount).toBe("function");
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
      expect(result).toMatchObject(mockEndUser);
      expect(typeof result.addEvmAccount).toBe("function");
      expect(typeof result.addEvmSmartAccount).toBe("function");
      expect(typeof result.addSolanaAccount).toBe("function");
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

  describe("addEndUserEvmAccount", () => {
    const mockEvmAccountResult = {
      evmAccount: {
        address: "0x456",
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    it("should add an EVM account to an existing end user", async () => {
      const options: AddEndUserEvmAccountOptions = {
        userId: "test-user-id",
      };
      (
        CdpOpenApiClient.addEndUserEvmAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserEvmAccount
        >
      ).mockResolvedValue(mockEvmAccountResult);

      const result = await client.addEndUserEvmAccount(options);

      expect(CdpOpenApiClient.addEndUserEvmAccount).toHaveBeenCalledWith("test-user-id", {});
      expect(result).toEqual(mockEvmAccountResult);
    });

    it("should handle errors when adding an EVM account", async () => {
      const options: AddEndUserEvmAccountOptions = {
        userId: "test-user-id",
      };
      const expectedError = new APIError(404, "not_found", "End user not found");
      (
        CdpOpenApiClient.addEndUserEvmAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserEvmAccount
        >
      ).mockRejectedValue(expectedError);

      await expect(client.addEndUserEvmAccount(options)).rejects.toThrow(expectedError);
    });
  });

  describe("addEndUserEvmSmartAccount", () => {
    const mockEvmSmartAccountResult = {
      evmSmartAccount: {
        address: "0x789",
        ownerAddresses: ["0x456"],
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    it("should add an EVM smart account with spend permissions enabled", async () => {
      const options: AddEndUserEvmSmartAccountOptions = {
        userId: "test-user-id",
        enableSpendPermissions: true,
      };
      (
        CdpOpenApiClient.addEndUserEvmSmartAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserEvmSmartAccount
        >
      ).mockResolvedValue(mockEvmSmartAccountResult);

      const result = await client.addEndUserEvmSmartAccount(options);

      expect(CdpOpenApiClient.addEndUserEvmSmartAccount).toHaveBeenCalledWith("test-user-id", {
        enableSpendPermissions: true,
      });
      expect(result).toEqual(mockEvmSmartAccountResult);
    });

    it("should add an EVM smart account with spend permissions disabled", async () => {
      const options: AddEndUserEvmSmartAccountOptions = {
        userId: "test-user-id",
        enableSpendPermissions: false,
      };
      (
        CdpOpenApiClient.addEndUserEvmSmartAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserEvmSmartAccount
        >
      ).mockResolvedValue(mockEvmSmartAccountResult);

      const result = await client.addEndUserEvmSmartAccount(options);

      expect(CdpOpenApiClient.addEndUserEvmSmartAccount).toHaveBeenCalledWith("test-user-id", {
        enableSpendPermissions: false,
      });
      expect(result).toEqual(mockEvmSmartAccountResult);
    });

    it("should handle errors when adding an EVM smart account", async () => {
      const options: AddEndUserEvmSmartAccountOptions = {
        userId: "test-user-id",
        enableSpendPermissions: true,
      };
      const expectedError = new APIError(404, "not_found", "End user not found");
      (
        CdpOpenApiClient.addEndUserEvmSmartAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserEvmSmartAccount
        >
      ).mockRejectedValue(expectedError);

      await expect(client.addEndUserEvmSmartAccount(options)).rejects.toThrow(expectedError);
    });
  });

  describe("addEndUserSolanaAccount", () => {
    const mockSolanaAccountResult = {
      solanaAccount: {
        address: "solana123",
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    it("should add a Solana account to an existing end user", async () => {
      const options: AddEndUserSolanaAccountOptions = {
        userId: "test-user-id",
      };
      (
        CdpOpenApiClient.addEndUserSolanaAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserSolanaAccount
        >
      ).mockResolvedValue(mockSolanaAccountResult);

      const result = await client.addEndUserSolanaAccount(options);

      expect(CdpOpenApiClient.addEndUserSolanaAccount).toHaveBeenCalledWith("test-user-id", {});
      expect(result).toEqual(mockSolanaAccountResult);
    });

    it("should handle errors when adding a Solana account", async () => {
      const options: AddEndUserSolanaAccountOptions = {
        userId: "test-user-id",
      };
      const expectedError = new APIError(404, "not_found", "End user not found");
      (
        CdpOpenApiClient.addEndUserSolanaAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserSolanaAccount
        >
      ).mockRejectedValue(expectedError);

      await expect(client.addEndUserSolanaAccount(options)).rejects.toThrow(expectedError);
    });
  });

  describe("revokeDelegationForEndUser", () => {
    it("should revoke delegation for an end user", async () => {
      const options: RevokeDelegationForEndUserOptions = {
        userId: "test-user-id",
      };
      (
        CdpOpenApiClient.revokeDelegationForEndUser as MockedFunction<
          typeof CdpOpenApiClient.revokeDelegationForEndUser
        >
      ).mockResolvedValue(undefined);

      await client.revokeDelegationForEndUser(options);

      expect(CdpOpenApiClient.revokeDelegationForEndUser).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        {},
      );
    });

    it("should handle errors when revoking delegation", async () => {
      const options: RevokeDelegationForEndUserOptions = {
        userId: "test-user-id",
      };
      const expectedError = new APIError(404, "not_found", "End user not found");
      (
        CdpOpenApiClient.revokeDelegationForEndUser as MockedFunction<
          typeof CdpOpenApiClient.revokeDelegationForEndUser
        >
      ).mockRejectedValue(expectedError);

      await expect(client.revokeDelegationForEndUser(options)).rejects.toThrow(expectedError);
    });
  });

  describe("EndUserAccount methods", () => {
    const mockEvmAccountResult = {
      evmAccount: {
        address: "0x456",
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    const mockEvmSmartAccountResult = {
      evmSmartAccount: {
        address: "0x789",
        ownerAddresses: ["0x456"],
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    const mockSolanaAccountResult = {
      solanaAccount: {
        address: "solana123",
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    it("should call addEvmAccount on EndUserAccount", async () => {
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.addEndUserEvmAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserEvmAccount
        >
      ).mockResolvedValue(mockEvmAccountResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const result = await endUser.addEvmAccount();

      expect(CdpOpenApiClient.addEndUserEvmAccount).toHaveBeenCalledWith(mockEndUser.userId, {});
      expect(result).toEqual(mockEvmAccountResult);
    });

    it("should call addEvmSmartAccount on EndUserAccount", async () => {
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.addEndUserEvmSmartAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserEvmSmartAccount
        >
      ).mockResolvedValue(mockEvmSmartAccountResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const result = await endUser.addEvmSmartAccount({ enableSpendPermissions: true });

      expect(CdpOpenApiClient.addEndUserEvmSmartAccount).toHaveBeenCalledWith(mockEndUser.userId, {
        enableSpendPermissions: true,
      });
      expect(result).toEqual(mockEvmSmartAccountResult);
    });

    it("should call addSolanaAccount on EndUserAccount", async () => {
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.addEndUserSolanaAccount as MockedFunction<
          typeof CdpOpenApiClient.addEndUserSolanaAccount
        >
      ).mockResolvedValue(mockSolanaAccountResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const result = await endUser.addSolanaAccount();

      expect(CdpOpenApiClient.addEndUserSolanaAccount).toHaveBeenCalledWith(mockEndUser.userId, {});
      expect(result).toEqual(mockSolanaAccountResult);
    });

    it("should call revokeDelegation on EndUserAccount", async () => {
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.revokeDelegationForEndUser as MockedFunction<
          typeof CdpOpenApiClient.revokeDelegationForEndUser
        >
      ).mockResolvedValue(undefined);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await endUser.revokeDelegation();

      expect(CdpOpenApiClient.revokeDelegationForEndUser).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        {},
      );
    });
  });

  // ─── Delegated Sign/Send Operations ───

  describe("signEvmHash", () => {
    const mockResult = { signature: "0xsig123" };

    it("should sign an EVM hash on behalf of an end user", async () => {
      (
        CdpOpenApiClient.signEvmHashWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmHash({
        userId: "test-user-id",
        hash: "0xhash123",
        address: "0x123",
      });

      expect(CdpOpenApiClient.signEvmHashWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        { hash: "0xhash123", address: "0x123" },
      );
      expect(result).toEqual(mockResult);
    });

    it("should handle errors", async () => {
      const expectedError = new APIError(400, "invalid_request", "Invalid hash");
      (
        CdpOpenApiClient.signEvmHashWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccount
        >
      ).mockRejectedValue(expectedError);

      await expect(
        client.signEvmHash({ userId: "test-user-id", hash: "0x", address: "0x123" }),
      ).rejects.toThrow(expectedError);
    });
  });

  describe("signEvmTransaction", () => {
    const mockResult = { signedTransaction: "0xsigned123" };

    it("should sign an EVM transaction on behalf of an end user", async () => {
      (
        CdpOpenApiClient.signEvmTransactionWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signEvmTransactionWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmTransaction({
        userId: "test-user-id",
        address: "0x123",
        transaction: "0x02abc",
      });

      expect(CdpOpenApiClient.signEvmTransactionWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        { address: "0x123", transaction: "0x02abc" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signEvmMessage", () => {
    const mockResult = { signature: "0xmsgsig" };

    it("should sign an EVM message on behalf of an end user", async () => {
      (
        CdpOpenApiClient.signEvmMessageWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signEvmMessageWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmMessage({
        userId: "test-user-id",
        address: "0x123",
        message: "Hello",
      });

      expect(CdpOpenApiClient.signEvmMessageWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        { address: "0x123", message: "Hello" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signEvmTypedData", () => {
    const mockResult = { signature: "0xtypedsig" };
    const mockTypedData = {
      domain: { name: "Test" },
      types: { Test: [{ name: "value", type: "uint256" }] },
      primaryType: "Test",
      message: { value: 1 },
    };

    it("should sign EVM typed data on behalf of an end user", async () => {
      (
        CdpOpenApiClient.signEvmTypedDataWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signEvmTypedDataWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmTypedData({
        userId: "test-user-id",
        address: "0x123",
        typedData: mockTypedData,
      });

      expect(CdpOpenApiClient.signEvmTypedDataWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        { address: "0x123", typedData: mockTypedData },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("sendEvmTransaction", () => {
    const mockResult = { transactionHash: "0xtxhash" };

    it("should send an EVM transaction on behalf of an end user", async () => {
      (
        CdpOpenApiClient.sendEvmTransactionWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendEvmTransactionWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendEvmTransaction({
        userId: "test-user-id",
        address: "0x123",
        transaction: "0x02abc",
        network: "base-sepolia",
      });

      expect(CdpOpenApiClient.sendEvmTransactionWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        {
          address: "0x123",
          transaction: "0x02abc",
          network: "base-sepolia",
        },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("sendEvmAsset", () => {
    const mockResult = { transactionHash: "0xassethash", userOpHash: null };

    it("should send an EVM asset on behalf of an end user", async () => {
      (
        CdpOpenApiClient.sendEvmAssetWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendEvmAssetWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendEvmAsset({
        userId: "test-user-id",
        address: "0x123",
        to: "0xrecipient",
        amount: "1000000",
        network: "base-sepolia",
      });

      expect(CdpOpenApiClient.sendEvmAssetWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        "0x123",
        "usdc",
        {
          to: "0xrecipient",
          amount: "1000000",
          network: "base-sepolia",
          useCdpPaymaster: undefined,
          paymasterUrl: undefined,
        },
      );
      expect(result).toEqual(mockResult);
    });

    it("should pass custom asset parameter", async () => {
      (
        CdpOpenApiClient.sendEvmAssetWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendEvmAssetWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      await client.sendEvmAsset({
        userId: "test-user-id",
        address: "0x123",
        asset: "usdc",
        to: "0xrecipient",
        amount: "1000000",
        network: "base-sepolia",
        useCdpPaymaster: true,
      });

      expect(CdpOpenApiClient.sendEvmAssetWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        "0x123",
        "usdc",
        {
          to: "0xrecipient",
          amount: "1000000",
          network: "base-sepolia",
          useCdpPaymaster: true,
          paymasterUrl: undefined,
        },
      );
    });
  });

  describe("sendUserOperation", () => {
    const mockResult = {
      network: "base-sepolia" as const,
      userOpHash: "0xuophash",
      calls: [{ to: "0xrecipient", value: "0", data: "0x" }],
      status: "pending" as const,
    };

    it("should send a user operation on behalf of an end user", async () => {
      (
        CdpOpenApiClient.sendUserOperationWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendUserOperationWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const calls = [{ to: "0xrecipient", value: "0", data: "0x" }];

      const result = await client.sendUserOperation({
        userId: "test-user-id",
        address: "0xsmart",
        network: "base-sepolia",
        calls,
        useCdpPaymaster: true,
      });

      expect(CdpOpenApiClient.sendUserOperationWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        "0xsmart",
        {
          network: "base-sepolia",
          calls,
          useCdpPaymaster: true,
          paymasterUrl: undefined,
          dataSuffix: undefined,
        },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("createEvmEip7702Delegation", () => {
    const mockResult = { delegationOperationId: "op-123" };

    it("should create an EIP-7702 delegation on behalf of an end user", async () => {
      (
        CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.createEvmEip7702Delegation({
        userId: "test-user-id",
        address: "0x123",
        network: "base-sepolia",
        enableSpendPermissions: true,
      });

      expect(CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        {
          address: "0x123",
          network: "base-sepolia",
          enableSpendPermissions: true,
        },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signSolanaHash", () => {
    const mockResult = { signature: "solsig123" };

    it("should sign a Solana hash on behalf of an end user", async () => {
      (
        CdpOpenApiClient.signSolanaHashWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signSolanaHashWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signSolanaHash({
        userId: "test-user-id",
        hash: "base64hash",
        address: "So1ana123",
      });

      expect(CdpOpenApiClient.signSolanaHashWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        { hash: "base64hash", address: "So1ana123" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signSolanaMessage", () => {
    const mockResult = { signature: "solmsgsig" };

    it("should sign a Solana message on behalf of an end user", async () => {
      (
        CdpOpenApiClient.signSolanaMessageWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signSolanaMessageWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signSolanaMessage({
        userId: "test-user-id",
        address: "So1ana123",
        message: "base64msg",
      });

      expect(CdpOpenApiClient.signSolanaMessageWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        { address: "So1ana123", message: "base64msg" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signSolanaTransaction", () => {
    const mockResult = { signedTransaction: "solsignedtx" };

    it("should sign a Solana transaction on behalf of an end user", async () => {
      (
        CdpOpenApiClient.signSolanaTransactionWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signSolanaTransactionWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signSolanaTransaction({
        userId: "test-user-id",
        address: "So1ana123",
        transaction: "base64tx",
      });

      expect(CdpOpenApiClient.signSolanaTransactionWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        { address: "So1ana123", transaction: "base64tx" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("sendSolanaTransaction", () => {
    const mockResult = { transactionSignature: "soltxsig" };

    it("should send a Solana transaction on behalf of an end user", async () => {
      (
        CdpOpenApiClient.sendSolanaTransactionWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendSolanaTransactionWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendSolanaTransaction({
        userId: "test-user-id",
        address: "So1ana123",
        transaction: "base64tx",
        network: "solana-devnet",
      });

      expect(CdpOpenApiClient.sendSolanaTransactionWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        {
          address: "So1ana123",
          transaction: "base64tx",
          network: "solana-devnet",
        },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("sendSolanaAsset", () => {
    const mockResult = { transactionSignature: "solassetsig" };

    it("should send a Solana asset on behalf of an end user", async () => {
      (
        CdpOpenApiClient.sendSolanaAssetWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendSolanaAssetWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendSolanaAsset({
        userId: "test-user-id",
        address: "So1ana123",
        to: "Recipient123",
        amount: "1000000",
        network: "solana-devnet",
      });

      expect(CdpOpenApiClient.sendSolanaAssetWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        "test-user-id",
        "So1ana123",
        "usdc",
        {
          to: "Recipient123",
          amount: "1000000",
          network: "solana-devnet",
          createRecipientAta: undefined,
        },
      );
      expect(result).toEqual(mockResult);
    });
  });

  // ─── EndUserAccount Delegated Methods ───

  describe("EndUserAccount delegated methods", () => {
    it("should call signEvmHash with auto-picked address on EndUserAccount", async () => {
      const mockResult = { signature: "0xsig" };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.signEvmHashWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const result = await endUser.signEvmHash({ hash: "0xhash" });

      expect(CdpOpenApiClient.signEvmHashWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        { hash: "0xhash", address: "0x123" },
      );
      expect(result).toEqual(mockResult);
    });

    it("should call signEvmHash with explicit address override on EndUserAccount", async () => {
      const mockResult = { signature: "0xsig" };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.signEvmHashWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await endUser.signEvmHash({ hash: "0xhash", address: "0xcustom" });

      expect(CdpOpenApiClient.signEvmHashWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        { hash: "0xhash", address: "0xcustom" },
      );
    });

    it("should throw when no EVM account for auto-pick", async () => {
      const endUserNoAccounts = {
        ...mockEndUser,
        evmAccountObjects: [],
        evmAccounts: [],
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(endUserNoAccounts);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await expect(endUser.signEvmHash({ hash: "0xhash" })).rejects.toThrow("No EVM account found");
    });

    it("should call sendUserOperation with auto-picked smart account address", async () => {
      const mockResult = {
        network: "base-sepolia" as const,
        userOpHash: "0xuophash",
        calls: [{ to: "0xrecipient", value: "0", data: "0x" }],
        status: "pending" as const,
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.sendUserOperationWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendUserOperationWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const calls = [{ to: "0xrecipient", value: "0", data: "0x" }];

      await endUser.sendUserOperation({
        network: "base-sepolia",
        calls,
        useCdpPaymaster: true,
      });

      expect(CdpOpenApiClient.sendUserOperationWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        "0x123", // auto-picked from evmSmartAccountObjects[0]
        {
          network: "base-sepolia",
          calls,
          useCdpPaymaster: true,
          paymasterUrl: undefined,
          dataSuffix: undefined,
        },
      );
    });

    it("should throw when no smart account for sendUserOperation auto-pick", async () => {
      const endUserNoSmartAccounts = {
        ...mockEndUser,
        evmSmartAccountObjects: [],
        evmSmartAccounts: [],
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(endUserNoSmartAccounts);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await expect(
        endUser.sendUserOperation({
          network: "base-sepolia",
          calls: [{ to: "0x", value: "0", data: "0x" }],
          useCdpPaymaster: true,
        }),
      ).rejects.toThrow("No EVM smart account found");
    });

    it("should call signSolanaHash with auto-picked address on EndUserAccount", async () => {
      const mockResult = { signature: "solsig" };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.signSolanaHashWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.signSolanaHashWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const result = await endUser.signSolanaHash({ hash: "base64hash" });

      expect(CdpOpenApiClient.signSolanaHashWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        { hash: "base64hash", address: "test123" },
      );
      expect(result).toEqual(mockResult);
    });

    it("should throw when no Solana account for auto-pick", async () => {
      const endUserNoSolana = {
        ...mockEndUser,
        solanaAccountObjects: [],
        solanaAccounts: [],
      };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(endUserNoSolana);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await expect(endUser.signSolanaHash({ hash: "base64hash" })).rejects.toThrow(
        "No Solana account found",
      );
    });

    it("should call sendEvmAsset with auto-picked address and default asset", async () => {
      const mockResult = { transactionHash: "0xhash", userOpHash: null };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.sendEvmAssetWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendEvmAssetWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await endUser.sendEvmAsset({
        to: "0xrecipient",
        amount: "1000000",
        network: "base-sepolia",
      });

      expect(CdpOpenApiClient.sendEvmAssetWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        "0x123",
        "usdc",
        {
          to: "0xrecipient",
          amount: "1000000",
          network: "base-sepolia",
          useCdpPaymaster: undefined,
          paymasterUrl: undefined,
        },
      );
    });

    it("should call sendSolanaAsset with auto-picked address on EndUserAccount", async () => {
      const mockResult = { transactionSignature: "solsig" };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.sendSolanaAssetWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.sendSolanaAssetWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await endUser.sendSolanaAsset({
        to: "Recipient",
        amount: "1000000",
        network: "solana-devnet",
      });

      expect(CdpOpenApiClient.sendSolanaAssetWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        "test123",
        "usdc",
        {
          to: "Recipient",
          amount: "1000000",
          network: "solana-devnet",
          createRecipientAta: undefined,
        },
      );
    });

    it("should call createEvmEip7702Delegation with auto-picked address on EndUserAccount", async () => {
      const mockResult = { delegationOperationId: "op-123" };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
      ).mockResolvedValue(mockEndUser);
      (
        CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccount as MockedFunction<
          typeof CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccount
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const result = await endUser.createEvmEip7702Delegation({
        network: "base-sepolia",
      });

      expect(CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccount).toHaveBeenCalledWith(
        testProjectId,
        mockEndUser.userId,
        {
          address: "0x123",
          network: "base-sepolia",
          enableSpendPermissions: undefined,
        },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("requireProjectId", () => {
    const expectedMessage =
      "Missing required project ID for delegation operation. " +
      "Set the CDP_PROJECT_ID environment variable or pass projectId to the CdpClient constructor.";

    let clientWithoutProjectId: CDPEndUserClient;

    beforeEach(() => {
      clientWithoutProjectId = new CDPEndUserClient();
    });

    it("should throw UserInputValidationError for revokeDelegationForEndUser", async () => {
      await expect(
        clientWithoutProjectId.revokeDelegationForEndUser({ userId: "user-1" }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for signEvmHash", async () => {
      await expect(
        clientWithoutProjectId.signEvmHash({
          userId: "user-1",
          hash: "0xhash",
          address: "0x123",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for signEvmTransaction", async () => {
      await expect(
        clientWithoutProjectId.signEvmTransaction({
          userId: "user-1",
          address: "0x123",
          transaction: "0x02",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for signEvmMessage", async () => {
      await expect(
        clientWithoutProjectId.signEvmMessage({
          userId: "user-1",
          address: "0x123",
          message: "hello",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for signEvmTypedData", async () => {
      await expect(
        clientWithoutProjectId.signEvmTypedData({
          userId: "user-1",
          address: "0x123",
          typedData: {},
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for sendEvmTransaction", async () => {
      await expect(
        clientWithoutProjectId.sendEvmTransaction({
          userId: "user-1",
          address: "0x123",
          transaction: "0x02",
          network: "base-sepolia",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for sendEvmAsset", async () => {
      await expect(
        clientWithoutProjectId.sendEvmAsset({
          userId: "user-1",
          address: "0x123",
          to: "0xrecipient",
          amount: "1000000",
          network: "base-sepolia",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for sendUserOperation", async () => {
      await expect(
        clientWithoutProjectId.sendUserOperation({
          userId: "user-1",
          address: "0xsmart",
          network: "base-sepolia",
          calls: [{ to: "0x", value: "0", data: "0x" }],
          useCdpPaymaster: true,
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for createEvmEip7702Delegation", async () => {
      await expect(
        clientWithoutProjectId.createEvmEip7702Delegation({
          userId: "user-1",
          address: "0x123",
          network: "base-sepolia",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for signSolanaHash", async () => {
      await expect(
        clientWithoutProjectId.signSolanaHash({
          userId: "user-1",
          hash: "base64hash",
          address: "So1ana123",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for signSolanaMessage", async () => {
      await expect(
        clientWithoutProjectId.signSolanaMessage({
          userId: "user-1",
          address: "So1ana123",
          message: "base64msg",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for signSolanaTransaction", async () => {
      await expect(
        clientWithoutProjectId.signSolanaTransaction({
          userId: "user-1",
          address: "So1ana123",
          transaction: "base64tx",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for sendSolanaTransaction", async () => {
      await expect(
        clientWithoutProjectId.sendSolanaTransaction({
          userId: "user-1",
          address: "So1ana123",
          transaction: "base64tx",
          network: "solana-devnet",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });

    it("should throw UserInputValidationError for sendSolanaAsset", async () => {
      await expect(
        clientWithoutProjectId.sendSolanaAsset({
          userId: "user-1",
          address: "So1ana123",
          to: "Recipient",
          amount: "1000000",
          network: "solana-devnet",
        }),
      ).rejects.toThrow(new UserInputValidationError(expectedMessage));
    });
  });
});
