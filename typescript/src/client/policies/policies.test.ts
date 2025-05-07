import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";
import { ZodError } from "zod";

import { CdpOpenApiClient } from "../../openapi-client/index.js";

import { PoliciesClient } from "./policies.js";
import { APIError } from "../../openapi-client/errors.js";
import { Policy } from "../../policies/types.js";

vi.mock("../../openapi-client/index.js", () => {
  return {
    CdpOpenApiClient: {
      listPolicies: vi.fn(),
      createPolicy: vi.fn(),
      getPolicyById: vi.fn(),
      deletePolicy: vi.fn(),
      updatePolicy: vi.fn(),
    },
  };
});

describe("PoliciesClient", () => {
  let client: PoliciesClient;
  const mockPolicy: Policy = {
    id: "policy-123",
    scope: "account",
    description: "Test policy",
    rules: [
      {
        action: "reject",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "ethValue",
            ethValue: "1000000000000000000",
            operator: ">",
          },
        ],
      },
    ],
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new PoliciesClient();
  });

  describe("listPolicies", () => {
    it("should list policies", async () => {
      const listPoliciesMock = CdpOpenApiClient.listPolicies as MockedFunction<
        typeof CdpOpenApiClient.listPolicies
      >;
      listPoliciesMock.mockResolvedValue({
        policies: [mockPolicy],
        nextPageToken: "next-page-token",
      });

      const result = await client.listPolicies({ scope: "account" });
      expect(result).toEqual({
        policies: [mockPolicy],
        nextPageToken: "next-page-token",
      });
      expect(listPoliciesMock).toHaveBeenCalledWith({ scope: "account" });
    });

    it("should list policies with pagination parameters", async () => {
      const listPoliciesMock = CdpOpenApiClient.listPolicies as MockedFunction<
        typeof CdpOpenApiClient.listPolicies
      >;
      listPoliciesMock.mockResolvedValue({
        policies: [mockPolicy],
        nextPageToken: undefined,
      });

      const result = await client.listPolicies({
        pageSize: 10,
        pageToken: "page-token",
      });

      expect(result).toEqual({
        policies: [mockPolicy],
        nextPageToken: undefined,
      });
      expect(listPoliciesMock).toHaveBeenCalledWith({
        pageSize: 10,
        pageToken: "page-token",
      });
    });

    it("should list policies with default empty options", async () => {
      const listPoliciesMock = CdpOpenApiClient.listPolicies as MockedFunction<
        typeof CdpOpenApiClient.listPolicies
      >;
      listPoliciesMock.mockResolvedValue({
        policies: [mockPolicy],
      });

      const result = await client.listPolicies();
      expect(result).toEqual({
        policies: [mockPolicy],
      });
      expect(listPoliciesMock).toHaveBeenCalledWith({});
    });
  });

  describe("createPolicy", () => {
    it("should create a policy", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;
      createPolicyMock.mockResolvedValue(mockPolicy);

      const policyToCreate = {
        scope: "account" as const,
        description: "Test policy",
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "1000000000000000000",
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      const result = await client.createPolicy({
        policy: policyToCreate,
        idempotencyKey: "idem-key",
      });

      expect(result).toEqual(mockPolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyToCreate, "idem-key");
    });

    it("should create a policy without idempotency key", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;
      createPolicyMock.mockResolvedValue(mockPolicy);

      const policyToCreate = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "1000000000000000000",
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      const result = await client.createPolicy({
        policy: policyToCreate,
      });

      expect(result).toEqual(mockPolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyToCreate, undefined);
    });

    it("should throw a ZodError for invalid policy with missing scope", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const invalidPolicy = {
        rules: [],
      };

      // @ts-expect-error Intentionally missing required field for test
      await expect(client.createPolicy({ policy: invalidPolicy })).rejects.toThrow(ZodError);
      expect(createPolicyMock).not.toHaveBeenCalled();
    });

    it("should throw a ZodError for invalid policy with invalid description format", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const invalidPolicy = {
        scope: "account" as const,
        description: "Invalid description with special characters: @#$%^&*",
        rules: [],
      };

      await expect(client.createPolicy({ policy: invalidPolicy })).rejects.toThrow(ZodError);
      expect(createPolicyMock).not.toHaveBeenCalled();
    });

    it("should throw a ZodError for invalid policy with incorrect criteria for operation", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const invalidPolicy = {
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "solAddress",
                addresses: ["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                operator: "in",
              },
            ],
          },
        ],
      };

      await expect(
        client.updatePolicy({
          id: "policy-123",
          // @ts-expect-error Intentionally using incorrect criteria structure for test
          policy: invalidPolicy,
        }),
      ).rejects.toThrow(ZodError);

      expect(updatePolicyMock).not.toHaveBeenCalled();
    });

    it("should throw a ZodError for invalid policy with invalid rule criteria for ethValue", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const invalidPolicy = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "not-a-number", // Invalid ethValue format
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      await expect(client.createPolicy({ policy: invalidPolicy })).rejects.toThrow(ZodError);
      expect(createPolicyMock).not.toHaveBeenCalled();
    });

    it("should throw a ZodError for invalid policy with invalid rule criteria for ethAddress", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const invalidEthAddressPolicy = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethAddress" as const,
                addreses: "not an array of addresses",
                operator: "not in" as const,
              },
            ],
          },
        ],
      };

      // @ts-expect-error Intentionally using invalid operation for test
      await expect(client.createPolicy({ policy: invalidEthAddressPolicy })).rejects.toThrow(
        ZodError,
      );
      expect(createPolicyMock).not.toHaveBeenCalled();

      let invalidEthAddressPolicy2 = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethAddress" as const,
                addreses: ["not an array of addresses"],
                operator: "not in" as const,
              },
            ],
          },
        ],
      };

      // @ts-expect-error Intentionally using invalid operation for test
      await expect(client.createPolicy({ policy: invalidEthAddressPolicy2 })).rejects.toThrow(
        ZodError,
      );
      expect(createPolicyMock).not.toHaveBeenCalled();

      let invalidEthAddressPolicy3 = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethAddress" as const,
                addreses: ["0x000000000000000000000000000000000000dead"],
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      // @ts-expect-error Intentionally using invalid operation for test
      await expect(client.createPolicy({ policy: invalidEthAddressPolicy3 })).rejects.toThrow(
        ZodError,
      );
      expect(createPolicyMock).not.toHaveBeenCalled();
    });
  });

  describe("getPolicyById", () => {
    it("should get a policy by ID", async () => {
      const getPolicyByIdMock = CdpOpenApiClient.getPolicyById as MockedFunction<
        typeof CdpOpenApiClient.getPolicyById
      >;
      getPolicyByIdMock.mockResolvedValue(mockPolicy);

      const result = await client.getPolicyById({ id: "policy-123" });
      expect(result).toEqual(mockPolicy);
      expect(getPolicyByIdMock).toHaveBeenCalledWith("policy-123");
    });

    it("should throw an error when policy is not found", async () => {
      const getPolicyByIdMock = CdpOpenApiClient.getPolicyById as MockedFunction<
        typeof CdpOpenApiClient.getPolicyById
      >;
      getPolicyByIdMock.mockRejectedValue(new APIError(404, "not_found", "Policy not found"));

      await expect(client.getPolicyById({ id: "non-existent" })).rejects.toThrow(
        "Policy not found",
      );
      expect(getPolicyByIdMock).toHaveBeenCalledWith("non-existent");
    });
  });

  describe("deletePolicy", () => {
    it("should delete a policy", async () => {
      const deletePolicyMock = CdpOpenApiClient.deletePolicy as MockedFunction<
        typeof CdpOpenApiClient.deletePolicy
      >;
      deletePolicyMock.mockResolvedValue(undefined);

      await client.deletePolicy({ id: "policy-123", idempotencyKey: "idem-key" });
      expect(deletePolicyMock).toHaveBeenCalledWith("policy-123", "idem-key");
    });

    it("should delete a policy without idempotency key", async () => {
      const deletePolicyMock = CdpOpenApiClient.deletePolicy as MockedFunction<
        typeof CdpOpenApiClient.deletePolicy
      >;
      deletePolicyMock.mockResolvedValue(undefined);

      await client.deletePolicy({ id: "policy-123" });
      expect(deletePolicyMock).toHaveBeenCalledWith("policy-123", undefined);
    });
  });

  describe("updatePolicy", () => {
    it("should update a policy", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;
      updatePolicyMock.mockResolvedValue(mockPolicy);

      const policyUpdate = {
        description: "Updated policy",
        rules: [
          {
            action: "accept" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "1000000000000000000",
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      const result = await client.updatePolicy({
        id: "policy-123",
        policy: policyUpdate,
        idempotencyKey: "idem-key",
      });

      expect(result).toEqual(mockPolicy);
      expect(updatePolicyMock).toHaveBeenCalledWith("policy-123", policyUpdate, "idem-key");
    });

    it("should update a policy without idempotency key", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;
      updatePolicyMock.mockResolvedValue(mockPolicy);

      const policyUpdate = {
        rules: [
          {
            action: "accept" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "1000000000000000000",
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      const result = await client.updatePolicy({
        id: "policy-123",
        policy: policyUpdate,
      });

      expect(result).toEqual(mockPolicy);
      expect(updatePolicyMock).toHaveBeenCalledWith("policy-123", policyUpdate, undefined);
    });

    it("should throw a ZodError for invalid policy with invalid description format", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const invalidPolicy = {
        description:
          "Invalid description with special characters: @#$%^&*!- also very long, way too long",
        rules: [],
      };

      await expect(
        client.updatePolicy({
          id: "policy-123",
          policy: invalidPolicy,
        }),
      ).rejects.toThrow(ZodError);

      expect(updatePolicyMock).not.toHaveBeenCalled();
    });

    it("should throw a ZodError for invalid policy with invalid rule operation", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const invalidPolicy = {
        rules: [
          {
            action: "accept" as const,
            operation: "invalidOperation",
            criteria: [],
          },
        ],
      };

      await expect(
        client.updatePolicy({
          id: "policy-123",
          // @ts-expect-error Intentionally using invalid operation for test
          policy: invalidPolicy,
        }),
      ).rejects.toThrow(ZodError);

      expect(updatePolicyMock).not.toHaveBeenCalled();
    });

    it("should throw a ZodError for invalid policy with incorrect criteria for operation", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const invalidPolicy = {
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "solAddress",
                addresses: ["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                operator: "in",
              },
            ],
          },
        ],
      };

      await expect(
        client.updatePolicy({
          id: "policy-123",
          // @ts-expect-error Intentionally using incorrect criteria structure for test
          policy: invalidPolicy,
        }),
      ).rejects.toThrow(ZodError);

      expect(updatePolicyMock).not.toHaveBeenCalled();
    });
  });
});
