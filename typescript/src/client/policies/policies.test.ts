import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";
import { ZodError } from "zod";

import { Abi, CdpOpenApiClient, Policy } from "../../openapi-client/index.js";

import { PoliciesClient } from "./policies.js";
import { APIError } from "../../openapi-client/errors.js";
import kitchenSinkAbi from "../../../fixtures/kitchenSinkAbi.js";

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

  describe("createPolicy with Solana rules", () => {
    it("should create a policy with signSolTransaction rule using solValue criterion", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const solanaPolicy = {
        ...mockPolicy,
        rules: [
          {
            action: "reject" as const,
            operation: "signSolTransaction" as const,
            criteria: [
              {
                type: "solValue" as const,
                solValue: "1000000000",
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      createPolicyMock.mockResolvedValue(solanaPolicy);

      const policyToCreate = {
        scope: "account" as const,
        description: "Limit SOL transactions to 1 SOL",
        rules: [
          {
            action: "reject" as const,
            operation: "signSolTransaction" as const,
            criteria: [
              {
                type: "solValue" as const,
                solValue: "1000000000",
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      const result = await client.createPolicy({
        policy: policyToCreate,
      });

      expect(result).toEqual(solanaPolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyToCreate, undefined);
    });

    it("should create a policy with signSolTransaction rule using splAddress criterion", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const policyToCreate = {
        scope: "account" as const,
        description: "Block specific SPL token addresses",
        rules: [
          {
            action: "reject" as const,
            operation: "signSolTransaction" as const,
            criteria: [
              {
                type: "splAddress" as const,
                addresses: ["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                operator: "in" as const,
              },
            ],
          },
        ],
      };

      const expectedSolanaPolicy = {
        id: "policy-sol-spl-addr",
        ...policyToCreate,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      createPolicyMock.mockResolvedValue(expectedSolanaPolicy);

      const result = await client.createPolicy({
        policy: policyToCreate,
      });

      expect(result).toEqual(expectedSolanaPolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyToCreate, undefined);
    });

    it("should create a policy with sendSolTransaction rule using mintAddress criterion", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const policyToCreate = {
        scope: "account" as const,
        description: "Allow only USDC mint transactions",
        rules: [
          {
            action: "accept" as const,
            operation: "sendSolTransaction" as const,
            criteria: [
              {
                type: "mintAddress" as const,
                addresses: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
                operator: "in" as const,
              },
            ],
          },
        ],
      };

      const expectedUsdcPolicy = {
        id: "policy-usdc-mint",
        ...policyToCreate,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      createPolicyMock.mockResolvedValue(expectedUsdcPolicy);

      const result = await client.createPolicy({
        policy: policyToCreate,
      });

      expect(result).toEqual(expectedUsdcPolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyToCreate, undefined);
    });

    it("should create a policy with sendSolTransaction rule using splValue criterion", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const policyToCreate = {
        scope: "account" as const,
        description: "Limit SPL token transfer amounts",
        rules: [
          {
            action: "reject" as const,
            operation: "sendSolTransaction" as const,
            criteria: [
              {
                type: "splValue" as const,
                splValue: "1000000",
                operator: ">=" as const,
              },
            ],
          },
        ],
      };

      const expectedSplValuePolicy = {
        id: "policy-spl-value-limit",
        ...policyToCreate,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      createPolicyMock.mockResolvedValue(expectedSplValuePolicy);

      const result = await client.createPolicy({
        policy: policyToCreate,
      });

      expect(result).toEqual(expectedSplValuePolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyToCreate, undefined);
    });

    it("should create a policy with signSolTransaction rule using multiple criteria", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;
      const policyToCreate = {
        scope: "account" as const,
        description: "Complex Solana transaction policy",
        rules: [
          {
            action: "reject" as const,
            operation: "signSolTransaction" as const,
            criteria: [
              {
                type: "solAddress" as const,
                addresses: ["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                operator: "in" as const,
              },
              {
                type: "solValue" as const,
                solValue: "500000000",
                operator: ">" as const,
              },
              {
                type: "mintAddress" as const,
                addresses: ["So11111111111111111111111111111111111111112"],
                operator: "not in" as const,
              },
            ],
          },
        ],
      };

      const expectedComplexPolicy = {
        id: "policy-complex-solana",
        ...policyToCreate,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      createPolicyMock.mockResolvedValue(expectedComplexPolicy);

      const result = await client.createPolicy({
        policy: policyToCreate,
      });

      expect(result).toEqual(expectedComplexPolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyToCreate, undefined);
    });

    it("should throw ZodError for invalid solValue format in signSolTransaction rule", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const invalidPolicy = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "signSolTransaction" as const,
            criteria: [
              {
                type: "solValue" as const,
                solValue: "not-a-number", // Invalid solValue format
                operator: ">" as const,
              },
            ],
          },
        ],
      };

      await expect(client.createPolicy({ policy: invalidPolicy })).rejects.toThrow(ZodError);
      expect(createPolicyMock).not.toHaveBeenCalled();
    });

    it("should throw ZodError for invalid Solana address format in splAddress criterion", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const invalidPolicy = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "sendSolTransaction" as const,
            criteria: [
              {
                type: "splAddress" as const,
                addresses: ["0x1234567890123456789012345678901234567890"], // Invalid Solana address (EVM format)
                operator: "in" as const,
              },
            ],
          },
        ],
      };

      await expect(client.createPolicy({ policy: invalidPolicy })).rejects.toThrow(ZodError);
      expect(createPolicyMock).not.toHaveBeenCalled();
    });

    it("should throw ZodError for unsupported criteria type in Solana operations", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;

      const invalidPolicy = {
        scope: "account" as const,
        rules: [
          {
            action: "reject" as const,
            operation: "signSolTransaction" as const,
            criteria: [
              {
                type: "ethValue", // EVM criterion type not supported for Solana operations
                ethValue: "1000000000000000000",
                operator: ">",
              },
            ],
          },
        ],
      };

      // @ts-expect-error Intentionally using invalid criteria type for test
      await expect(client.createPolicy({ policy: invalidPolicy })).rejects.toThrow(ZodError);
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

    it("should update a policy with Solana sendSolTransaction rules", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const solanaUpdate = {
        description: "Updated Solana policy",
        rules: [
          {
            action: "reject" as const,
            operation: "sendSolTransaction" as const,
            criteria: [
              {
                type: "splValue" as const,
                splValue: "5000000",
                operator: ">=" as const,
              },
              {
                type: "mintAddress" as const,
                addresses: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
                operator: "in" as const,
              },
            ],
          },
        ],
      };

      const expectedUpdatedPolicy = {
        id: "policy-123",
        scope: "account" as const,
        ...solanaUpdate,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T01:00:00Z",
      };

      updatePolicyMock.mockResolvedValue(expectedUpdatedPolicy);

      const result = await client.updatePolicy({
        id: "policy-123",
        policy: solanaUpdate,
      });

      expect(result).toEqual(expectedUpdatedPolicy);
      expect(updatePolicyMock).toHaveBeenCalledWith("policy-123", solanaUpdate, undefined);
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

    it("should throw a ZodError for invalid evmData criterion", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const assortedInvalidPolicies = [
        // no conditions
        {
          rules: [
            {
              action: "reject" as const,
              operation: "signEvmTransaction" as const,
              criteria: [
                {
                  type: "evmData",
                  abi: "erc20",
                  conditions: [],
                },
              ],
            },
          ],
        },
        // invalid known abi
        {
          rules: [
            {
              action: "reject" as const,
              operation: "signEvmTransaction" as const,
              criteria: [
                {
                  type: "evmData",
                  abi: "unknownabi",
                  conditions: [{ function: "transfer" }],
                },
              ],
            },
          ],
        },
        // invalid explicit abi
        {
          rules: [
            {
              action: "reject" as const,
              operation: "signEvmTransaction" as const,
              criteria: [
                {
                  type: "evmData",
                  abi: { foo: "bar" },
                  conditions: [{ function: "transfer" }],
                },
              ],
            },
          ],
        },
        // invalid condition shapes
        {
          rules: [
            {
              action: "reject" as const,
              operation: "signEvmTransaction" as const,
              criteria: [
                {
                  type: "evmData",
                  abi: "erc721",
                  conditions: [{ function: "transfer", params: [] }],
                },
              ],
            },
          ],
        },
        // empty function name
        {
          rules: [
            {
              action: "reject" as const,
              operation: "signEvmTransaction" as const,
              criteria: [
                {
                  type: "evmData",
                  abi: "erc721",
                  conditions: [{ function: "" }],
                },
              ],
            },
          ],
        },
        // can't use equality operators in list condition
        {
          rules: [
            {
              action: "reject" as const,
              operation: "signEvmTransaction" as const,
              criteria: [
                {
                  type: "evmData",
                  abi: "erc721",
                  conditions: [
                    {
                      function: "transfer",
                      params: [{ name: "to", operator: ">=", values: ["cool"] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      for (const policy of assortedInvalidPolicies) {
        await expect(
          client.updatePolicy({
            id: "policy-123",
            // @ts-expect-error Intentionally using incorrect criteria structure for test
            policy,
          }),
        ).rejects.toThrow(ZodError);
        expect(updatePolicyMock).not.toHaveBeenCalled();
      }
    });

    it("should permit a valid evmDataCriterion policy", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const validPolicy = {
        scope: "account",
        description: "Valid evmDataCriterion test policy",
        rules: [
          {
            action: "reject" as const,
            operation: "signEvmTransaction" as const,
            criteria: [
              {
                type: "evmData" as const,
                abi: "erc20" as const,
                conditions: [
                  { function: "balanceOf" },
                  {
                    function: "transfer",
                    params: [{ name: "value", operator: "<=" as const, value: "10000" }],
                  },
                  {
                    function: "approve",
                    params: [
                      {
                        name: "0",
                        operator: "in" as const,
                        values: ["0x000000000000000000000000000000000000dead"],
                      },
                    ],
                  },
                ],
              },
              {
                type: "evmData" as const,
                abi: kitchenSinkAbi as Abi,
                conditions: [
                  { function: "bytesfn" },
                  {
                    function: "uintfn",
                    params: [{ name: "x", operator: "<=" as const, value: "10000" }],
                  },
                  {
                    function: "addressfn",
                    params: [
                      {
                        name: "0",
                        operator: "in" as const,
                        values: ["0x000000000000000000000000000000000000dead"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      await client.updatePolicy({
        id: "policy-123",
        // @ts-expect-error arbitrary drift between abitype Abi and api Abi
        policy: validPolicy,
      });
      expect(updatePolicyMock).toHaveBeenCalled();
    });

    it("should permit valid prepareUserOperation policies", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;
      updatePolicyMock.mockResolvedValue(mockPolicy);

      const validPrepareUserOpPolicy = {
        rules: [
          {
            action: "accept" as const,
            operation: "prepareUserOperation" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "1000000000000000000",
                operator: "<=" as const,
              },
              {
                type: "evmAddress" as const,
                addresses: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as const],
                operator: "in" as const,
              },
              {
                type: "evmNetwork" as const,
                networks: ["base" as const, "base-sepolia" as const],
                operator: "in" as const,
              },
              {
                type: "evmData" as const,
                abi: "erc20" as const,
                conditions: [
                  {
                    function: "transfer",
                    params: [{ name: "value", operator: "<=" as const, value: "10000" }],
                  },
                ],
              },
            ],
          },
        ],
      };

      await client.updatePolicy({
        id: "policy-123",
        policy: validPrepareUserOpPolicy,
      });

      expect(updatePolicyMock).toHaveBeenCalled();
    });

    it("should permit valid sendUserOperation policies", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;
      updatePolicyMock.mockResolvedValue(mockPolicy);

      const validSendUserOpPolicy = {
        rules: [
          {
            action: "reject" as const,
            operation: "sendUserOperation" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "2000000000000000000",
                operator: ">" as const,
              },
              {
                type: "evmAddress" as const,
                addresses: ["0x1234567890123456789012345678901234567890" as const],
                operator: "not in" as const,
              },
              {
                type: "evmData" as const,
                abi: "erc721" as const,
                conditions: [
                  {
                    function: "transferFrom",
                    params: [
                      {
                        name: "tokenId",
                        operator: "in" as const,
                        values: ["1", "2", "3"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      await client.updatePolicy({
        id: "policy-123",
        policy: validSendUserOpPolicy,
      });

      expect(updatePolicyMock).toHaveBeenCalled();
    });

    it("should throw ZodError for invalid prepareUserOperation criteria", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const invalidPrepareUserOpPolicies = [
        // Using solAddress criterion (not supported for prepareUserOperation)
        {
          rules: [
            {
              action: "reject" as const,
              operation: "prepareUserOperation" as const,
              criteria: [
                {
                  type: "solAddress",
                  addresses: ["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                  operator: "in",
                },
              ],
            },
          ],
        },
        // Using evmMessage criterion (not supported for prepareUserOperation)
        {
          rules: [
            {
              action: "accept" as const,
              operation: "prepareUserOperation" as const,
              criteria: [
                {
                  type: "evmMessage",
                  match: "^hello",
                },
              ],
            },
          ],
        },
      ];

      for (const policy of invalidPrepareUserOpPolicies) {
        await expect(
          client.updatePolicy({
            id: "policy-123",
            // @ts-expect-error Intentionally using incorrect criteria structure for test
            policy,
          }),
        ).rejects.toThrow(ZodError);
        expect(updatePolicyMock).not.toHaveBeenCalled();
      }
    });

    it("should throw ZodError for invalid sendUserOperation criteria", async () => {
      const updatePolicyMock = CdpOpenApiClient.updatePolicy as MockedFunction<
        typeof CdpOpenApiClient.updatePolicy
      >;

      const invalidSendUserOpPolicies = [
        // Using solAddress criterion (not supported for sendUserOperation)
        {
          rules: [
            {
              action: "reject" as const,
              operation: "sendUserOperation" as const,
              criteria: [
                {
                  type: "solAddress",
                  addresses: ["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                  operator: "in",
                },
              ],
            },
          ],
        },
        // Using evmNetwork criterion (not supported for sendUserOperation)
        {
          rules: [
            {
              action: "accept" as const,
              operation: "sendUserOperation" as const,
              criteria: [
                {
                  type: "evmNetwork",
                  networks: ["base"],
                  operator: "in",
                },
              ],
            },
          ],
        },
        // Using evmMessage criterion (not supported for sendUserOperation)
        {
          rules: [
            {
              action: "reject" as const,
              operation: "sendUserOperation" as const,
              criteria: [
                {
                  type: "evmMessage",
                  match: "^test message",
                },
              ],
            },
          ],
        },
      ];

      for (const policy of invalidSendUserOpPolicies) {
        await expect(
          client.updatePolicy({
            id: "policy-123",
            // @ts-expect-error Intentionally using incorrect criteria structure for test
            policy,
          }),
        ).rejects.toThrow(ZodError);
        expect(updatePolicyMock).not.toHaveBeenCalled();
      }
    });

    it("should create policies with prepareUserOperation and sendUserOperation operations", async () => {
      const createPolicyMock = CdpOpenApiClient.createPolicy as MockedFunction<
        typeof CdpOpenApiClient.createPolicy
      >;
      createPolicyMock.mockResolvedValue(mockPolicy);

      const policyWithUserOperations = {
        scope: "account" as const,
        description: "User operation policy",
        rules: [
          {
            action: "accept" as const,
            operation: "prepareUserOperation" as const,
            criteria: [
              {
                type: "ethValue" as const,
                ethValue: "1000000000000000000",
                operator: "<=" as const,
              },
            ],
          },
          {
            action: "reject" as const,
            operation: "sendUserOperation" as const,
            criteria: [
              {
                type: "evmAddress" as const,
                addresses: ["0x1234567890123456789012345678901234567890" as const],
                operator: "in" as const,
              },
            ],
          },
        ],
      };

      const result = await client.createPolicy({
        policy: policyWithUserOperations,
        idempotencyKey: "idem-key",
      });

      expect(result).toEqual(mockPolicy);
      expect(createPolicyMock).toHaveBeenCalledWith(policyWithUserOperations, "idem-key");
    });
  });
});
