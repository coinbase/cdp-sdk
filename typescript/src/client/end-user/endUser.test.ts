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
      revokeDelegationForEndUserDelegation: vi.fn(),
      signEvmHashWithEndUserAccountDelegation: vi.fn(),
      signEvmTransactionWithEndUserAccountDelegation: vi.fn(),
      signEvmMessageWithEndUserAccountDelegation: vi.fn(),
      signEvmTypedDataWithEndUserAccountDelegation: vi.fn(),
      sendEvmTransactionWithEndUserAccountDelegation: vi.fn(),
      sendEvmAssetWithEndUserAccountDelegation: vi.fn(),
      sendUserOperationWithEndUserAccountDelegation: vi.fn(),
      createEvmEip7702DelegationWithEndUserAccountDelegation: vi.fn(),
      signSolanaHashWithEndUserAccountDelegation: vi.fn(),
      signSolanaMessageWithEndUserAccountDelegation: vi.fn(),
      signSolanaTransactionWithEndUserAccountDelegation: vi.fn(),
      sendSolanaTransactionWithEndUserAccountDelegation: vi.fn(),
      sendSolanaAssetWithEndUserAccountDelegation: vi.fn(),
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
        CdpOpenApiClient.revokeDelegationForEndUserDelegation as MockedFunction<
          typeof CdpOpenApiClient.revokeDelegationForEndUserDelegation
        >
      ).mockResolvedValue(undefined);

      await client.revokeDelegationForEndUser(options);

      expect(CdpOpenApiClient.revokeDelegationForEndUserDelegation).toHaveBeenCalledWith(
        "test-user-id",
        {},
      );
    });

    it("should handle errors when revoking delegation", async () => {
      const options: RevokeDelegationForEndUserOptions = {
        userId: "test-user-id",
      };
      CdpOpenApiClient.revokeDelegationForEndUserDelegation as MockedFunction<
          typeof CdpOpenApiClient.revokeDelegationForEndUserDelegation
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
          CdpOpenApiClient.revokeDelegationForEndUserDelegation as MockedFunction<
          typeof CdpOpenApiClient.revokeDelegationForEndUserDelegation
        >
      ).mockResolvedValue(undefined);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      expect(CdpOpenApiClient.revokeDelegationForEndUserDelegation).toHaveBeenCalledWith(
        mockEndUser.userId,
        {},
      );
    });
  });

  // ─── Delegated Sign/Send Operations ───

  describe("signEvmHash", () => {
    const mockResult = { signature: "0xsig123" };

    CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmHash({
        userId: "test-user-id",
        hash: "0xhash123",
        address: "0x123",
        expect(CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation).toHaveBeenCalledWith(
        "test-user-id",
        { hash: "0xhash123", address: "0x123" },
      );
      expect(result).toEqual(mockResult);
    });

    it("should handle errors", async () => {
      CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation
        >
      ).mockRejectedValue(expectedError);

      await expect(
        client.signEvmHash({ userId: "test-user-id", hash: "0x", address: "0x123" }),
      ).rejects.toThrow(expectedError);
    });
  });

  describe("signEvmTransaction", () => {
    const mockResult = { signedTransaction: "0xsigned123" };

    CdpOpenApiClient.signEvmTransactionWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signEvmTransactionWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmTransaction({
        userId: "test-user-id",
        address: "0x123",
        transaction: "0x02abc",
        expect(CdpOpenApiClient.signEvmTransactionWithEndUserAccountDelegation).toHaveBeenCalledWith(
        "test-user-id",
        { address: "0x123", transaction: "0x02abc" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signEvmMessage", () => {
    const mockResult = { signature: "0xmsgsig" };

    CdpOpenApiClient.signEvmMessageWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signEvmMessageWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmMessage({
        userId: "test-user-id",
        address: "0x123",
        message: "Hello",
        expect(CdpOpenApiClient.signEvmMessageWithEndUserAccountDelegation).toHaveBeenCalledWith(
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

    CdpOpenApiClient.signEvmTypedDataWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signEvmTypedDataWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signEvmTypedData({
        userId: "test-user-id",
        address: "0x123",
        typedData: mockTypedData,
        expect(CdpOpenApiClient.signEvmTypedDataWithEndUserAccountDelegation).toHaveBeenCalledWith(
        "test-user-id",
        { address: "0x123", typedData: mockTypedData },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("sendEvmTransaction", () => {
    const mockResult = { transactionHash: "0xtxhash" };

    CdpOpenApiClient.sendEvmTransactionWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendEvmTransactionWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendEvmTransaction({
        userId: "test-user-id",
        address: "0x123",
        transaction: "0x02abc",
        network: "base-sepolia",
        expect(CdpOpenApiClient.sendEvmTransactionWithEndUserAccountDelegation).toHaveBeenCalledWith(
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

    CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendEvmAsset({
        userId: "test-user-id",
        address: "0x123",
        to: "0xrecipient",
        amount: "1000000",
        network: "base-sepolia",
        expect(CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation).toHaveBeenCalledWith(
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

    CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation
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
        expect(CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation).toHaveBeenCalledWith(
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

    CdpOpenApiClient.sendUserOperationWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendUserOperationWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const calls = [{ to: "0xrecipient", value: "0", data: "0x" }];

      const result = await client.sendUserOperation({
        userId: "test-user-id",
        address: "0xsmart",
        network: "base-sepolia",
        calls,
        useCdpPaymaster: true,
        expect(CdpOpenApiClient.sendUserOperationWithEndUserAccountDelegation).toHaveBeenCalledWith(
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

    CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.createEvmEip7702Delegation({
        userId: "test-user-id",
        address: "0x123",
        network: "base-sepolia",
        enableSpendPermissions: true,
        expect(CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccountDelegation).toHaveBeenCalledWith(
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

    CdpOpenApiClient.signSolanaHashWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signSolanaHashWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signSolanaHash({
        userId: "test-user-id",
        hash: "base64hash",
        address: "So1ana123",
        expect(CdpOpenApiClient.signSolanaHashWithEndUserAccountDelegation).toHaveBeenCalledWith(
        "test-user-id",
        { hash: "base64hash", address: "So1ana123" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signSolanaMessage", () => {
    const mockResult = { signature: "solmsgsig" };

    CdpOpenApiClient.signSolanaMessageWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signSolanaMessageWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signSolanaMessage({
        userId: "test-user-id",
        address: "So1ana123",
        message: "base64msg",
        expect(CdpOpenApiClient.signSolanaMessageWithEndUserAccountDelegation).toHaveBeenCalledWith(
        "test-user-id",
        { address: "So1ana123", message: "base64msg" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("signSolanaTransaction", () => {
    const mockResult = { signedTransaction: "solsignedtx" };

    CdpOpenApiClient.signSolanaTransactionWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signSolanaTransactionWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.signSolanaTransaction({
        userId: "test-user-id",
        address: "So1ana123",
        transaction: "base64tx",
        expect(CdpOpenApiClient.signSolanaTransactionWithEndUserAccountDelegation).toHaveBeenCalledWith(
        "test-user-id",
        { address: "So1ana123", transaction: "base64tx" },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("sendSolanaTransaction", () => {
    const mockResult = { transactionSignature: "soltxsig" };

    CdpOpenApiClient.sendSolanaTransactionWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendSolanaTransactionWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendSolanaTransaction({
        userId: "test-user-id",
        address: "So1ana123",
        transaction: "base64tx",
        network: "solana-devnet",
        expect(CdpOpenApiClient.sendSolanaTransactionWithEndUserAccountDelegation).toHaveBeenCalledWith(
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

    CdpOpenApiClient.sendSolanaAssetWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendSolanaAssetWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const result = await client.sendSolanaAsset({
        userId: "test-user-id",
        address: "So1ana123",
        to: "Recipient123",
        amount: "1000000",
        network: "solana-devnet",
        expect(CdpOpenApiClient.sendSolanaAssetWithEndUserAccountDelegation).toHaveBeenCalledWith(
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
          CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      expect(CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation).toHaveBeenCalledWith(
        mockEndUser.userId,
        { hash: "0xhash", address: "0x123" },
      );
      expect(result).toEqual(mockResult);
    });

    it("should call signEvmHash with explicit address override on EndUserAccount", async () => {
      const mockResult = { signature: "0xsig" };
      (
        CdpOpenApiClient.createEndUser as MockedFunction<typeof CdpOpenApiClient.createEndUser>
          CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      expect(CdpOpenApiClient.signEvmHashWithEndUserAccountDelegation).toHaveBeenCalledWith(
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
          CdpOpenApiClient.sendUserOperationWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendUserOperationWithEndUserAccountDelegation
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
        expect(CdpOpenApiClient.sendUserOperationWithEndUserAccountDelegation).toHaveBeenCalledWith(
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
          CdpOpenApiClient.signSolanaHashWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.signSolanaHashWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      expect(CdpOpenApiClient.signSolanaHashWithEndUserAccountDelegation).toHaveBeenCalledWith(
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
          CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await endUser.sendEvmAsset({
        to: "0xrecipient",
        amount: "1000000",
        network: "base-sepolia",
        expect(CdpOpenApiClient.sendEvmAssetWithEndUserAccountDelegation).toHaveBeenCalledWith(
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
          CdpOpenApiClient.sendSolanaAssetWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.sendSolanaAssetWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      await endUser.sendSolanaAsset({
        to: "Recipient",
        amount: "1000000",
        network: "solana-devnet",
        expect(CdpOpenApiClient.sendSolanaAssetWithEndUserAccountDelegation).toHaveBeenCalledWith(
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
          CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccountDelegation as MockedFunction<
          typeof CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccountDelegation
        >
      ).mockResolvedValue(mockResult);

      const endUser = await client.createEndUser({
        authenticationMethods: [{ type: "email", email: "test@example.com" }],
      });

      const result = await endUser.createEvmEip7702Delegation({
        network: "base-sepolia",
        expect(CdpOpenApiClient.createEvmEip7702DelegationWithEndUserAccountDelegation).toHaveBeenCalledWith(
        mockEndUser.userId,
        {
          address: "0x123",
          network: "base-sepolia",
          enableSpendPermissions: undefined,
        },
      );
      expect(result).toEqual(mockResult);
    });
