import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import { CdpOpenApiClient } from "../../openapi-client";

import { CDPEndUserClient } from "./endUser.js";
import type { ValidateAccessTokenOptions } from "./endUser.types.js";
import { APIError } from "../../openapi-client/errors.js";

vi.mock("../../openapi-client", () => {
  return {
    CdpOpenApiClient: {
      validateEndUserAccessToken: vi.fn(),
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new CDPEndUserClient();
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
      expect(result).toBe(undefined);
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

      const result = await client.validateAccessToken(validateAccessTokenOptions);

      expect(result).rejects.toThrow(expectedError);
    });
  });
});
