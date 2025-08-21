/**
 * @module Client
 */

import {
  PoliciesClientInterface,
  CreatePolicyOptions,
  ListPoliciesOptions,
  ListPoliciesResult,
  GetPolicyByIdOptions,
  DeletePolicyOptions,
  UpdatePolicyOptions,
} from "./policies.types.js";
import { Analytics } from "../../analytics.js";
import {
  CdpOpenApiClient,
  CreatePolicyBody,
  UpdatePolicyBody,
} from "../../openapi-client/index.js";
import { Policy, CreatePolicyBodySchema, UpdatePolicyBodySchema } from "../../policies/types.js";

/**
 * The namespace containing all Policy methods.
 */
export class PoliciesClient implements PoliciesClientInterface {
  /**
   * Lists policies belonging to the developer's CDP Project.
   * Can be filtered by scope (project or account).
   *
   * @param {ListPoliciesOptions} [options] - Options for filtering and paginating the results
   * @param {string} [options.scope] - Filter policies by scope ('project' or 'account')
   * @param {number} [options.pageSize] - Maximum number of policies to return
   * @param {string} [options.pageToken] - Pagination cursor for fetching next page of results
   *
   * @returns {Promise<ListPoliciesResult>} A paginated list of policies
   *
   * @example **List all policies**
   *          ```ts
   *          const { policies } = await cdp.policies.listPolicies();
   *          ```
   *
   * @example **Filter by scope**
   *          ```ts
   *          const { policies } = await cdp.policies.listPolicies({
   *            scope: 'project'
   *          });
   *          ```
   *
   * @example **With pagination**
   *          ```ts
   *          // Get first page
   *          const firstPage = await cdp.policies.listPolicies({
   *            pageSize: 10
   *          });
   *
   *          // Get next page using cursor
   *          const nextPage = await cdp.policies.listPolicies({
   *            pageSize: 10,
   *            pageToken: firstPage.pageToken
   *          });
   *          ```
   */
  async listPolicies(options: ListPoliciesOptions = {}): Promise<ListPoliciesResult> {
    Analytics.trackAction({
      action: "list_policies",
      properties: {
        scope: options.scope,
      },
    });

    return CdpOpenApiClient.listPolicies(options) as Promise<ListPoliciesResult>;
  }

  /**
   * Creates a new policy that can be used to govern the behavior of projects and accounts.
   *
   * @param {CreatePolicyOptions} options - Options for creating the policy
   * @param {CreatePolicyBody} options.policy - The policy configuration to create
   * @param {string} [options.policy.description] - Description of the policy's purpose
   * @param {Rule[]} options.policy.rules - Rules that define the policy behavior
   * @param {string} [options.idempotencyKey] - An idempotency key to prevent duplicate policy creation
   *
   * @returns {Promise<Policy>} The created policy
   * @throws {ZodError<typeof CreatePolicyBodySchema>} When the policy is invalid
   *
   * @example **Creating a new EVM policy**
   *          ```ts
   *          const policy = await cdp.policies.createPolicy({
   *            policy: {
   *              scope: "account",
   *              description: "Limits the amount of ETH in transaction",
   *              rules: [
   *                {
   *                  action: "reject",
   *                  operation: "signEvmTransaction",
   *                  criteria: [
   *                    {
   *                      type: "ethValue",
   *                      ethValue: "1000000000000000000",
   *                      operator: ">",
   *                    },
   *                  ],
   *                },
   *              ],
   *            }
   *          });
   *          ```
   *
   * @example **Creating a new Solana policy**
   *          ```ts
   *          const policy = await cdp.policies.createPolicy({
   *            policy: {
   *              scope: "account",
   *              description: "Limits SOL transfers and SPL token operations",
   *              rules: [
   *                {
   *                  action: "reject",
   *                  operation: "signSolTransaction",
   *                  criteria: [
   *                    {
   *                      type: "solValue",
   *                      solValue: "1000000000", // 1 SOL in lamports
   *                      operator: ">",
   *                    },
   *                    {
   *                      type: "solAddress",
   *                      addresses: ["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
   *                      operator: "in",
   *                    },
   *                  ],
   *                },
   *                {
   *                  action: "accept",
   *                  operation: "sendSolTransaction",
   *                  criteria: [
   *                    {
   *                      type: "mintAddress",
   *                      addresses: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"], // USDC mint
   *                      operator: "in",
   *                    },
   *                  ],
   *                },
   *              ],
   *            }
   *          });
   *          ```
   *
   * @example **With idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // First call creates the policy
   *          const policy = await cdp.policies.createPolicy({
   *            policy: {
   *              scope: "account",
   *              description: "Limits the amount of ETH in transaction",
   *              rules: [
   *                {
   *                  action: "reject",
   *                  operation: "signEvmTransaction",
   *                  criteria: [
   *                    {
   *                      type: "ethValue",
   *                      ethValue: "1000000000000000000",
   *                      operator: ">",
   *                    },
   *                  ],
   *                },
   *              ],
   *            },
   *            idempotencyKey
   *          });
   *
   *          // Second call with same key returns the same policy
   *          const samePolicy = await cdp.policies.createPolicy({
   *            policy: { ... },
   *            idempotencyKey
   *          });
   *          ```
   */
  async createPolicy(options: CreatePolicyOptions): Promise<Policy> {
    Analytics.trackAction({
      action: "create_policy",
      properties: {
        scope: options.policy.scope,
      },
    });

    CreatePolicyBodySchema.parse(options.policy);
    return CdpOpenApiClient.createPolicy(
      // There are arbitrary differences between the abitype Abi and the openapi Abi
      options.policy as CreatePolicyBody,

      options.idempotencyKey,
    ) as Promise<Policy>;
  }

  /**
   * Retrieves a policy by its unique identifier.
   *
   * @param {GetPolicyByIdOptions} options - Options containing the policy ID to retrieve
   * @param {string} options.id - The unique identifier of the policy to retrieve
   *
   * @returns {Promise<Policy>} The requested policy
   *
   * @example **Retrieving a policy by ID**
   *          ```ts
   *          const policy = await cdp.policies.getPolicyById({
   *            id: "__ID__"
   *          });
   *
   *          console.log(policy.name);
   *          console.log(policy.rules);
   *          ```
   */
  async getPolicyById(options: GetPolicyByIdOptions): Promise<Policy> {
    Analytics.trackAction({
      action: "get_policy_by_id",
    });

    return CdpOpenApiClient.getPolicyById(options.id) as Promise<Policy>;
  }

  /**
   * Deletes a policy by its unique identifier.
   * If a policy is referenced by an active project or account, this operation will fail.
   *
   * @param {DeletePolicyOptions} options - Options containing the policy ID to delete
   * @param {string} options.id - The unique identifier of the policy to delete
   * @param {string} [options.idempotencyKey] - An idempotency key to prevent duplicate deletion
   *
   * @returns {Promise<void>} Void on successful deletion
   *
   * @example **Deleting a policy**
   *          ```ts
   *          await cdp.policies.deletePolicy({
   *            id: "__ID__"
   *          });
   *          ```
   *
   * @example **With idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // This operation is idempotent with the key
   *          await cdp.policies.deletePolicy({
   *            id: "__ID__",
   *            idempotencyKey
   *          });
   *          ```
   */
  async deletePolicy(options: DeletePolicyOptions): Promise<void> {
    Analytics.trackAction({
      action: "delete_policy",
    });

    return CdpOpenApiClient.deletePolicy(options.id, options.idempotencyKey);
  }

  /**
   * Updates an existing policy by its unique identifier.
   * This will apply the updated policy to any project or accounts that are currently using it.
   *
   * @param {UpdatePolicyOptions} options - Options containing the policy ID and updated policy data
   * @param {string} options.id - The unique identifier of the policy to update
   * @param {UpdatePolicyBody} options.policy - The updated policy configuration
   * @param {string} [options.policy.description] - Updated description of the policy's purpose
   * @param {Rule[]} [options.policy.rules] - Updated rules that define the policy behavior
   * @param {string} [options.idempotencyKey] - An idempotency key to prevent duplicate updates
   *
   * @returns {Promise<Policy>} The updated policy
   * @throws {ZodError<typeof UpdatePolicyBodySchema>} When the updated policy is invalid
   *
   * @example **Updating an EVM policy**
   *          ```ts
   *          const updatedPolicy = await cdp.policies.updatePolicy({
   *            id: "__ID__",
   *            policy: {
   *              description: "Now with lower transaction limits",
   *              rules: [
   *                {
   *                  action: "reject",
   *                  operation: "signEvmTransaction",
   *                  criteria: [
   *                    {
   *                      type: "ethValue",
   *                      ethValue: "1000000000",
   *                      operator: ">",
   *                    },
   *                  ],
   *                },
   *              ],
   *            },
   *          });
   *          ```
   *
   * @example **Updating a Solana policy**
   *          ```ts
   *          const updatedPolicy = await cdp.policies.updatePolicy({
   *            id: "__ID__",
   *            policy: {
   *              description: "Updated Solana transaction limits",
   *              rules: [
   *                {
   *                  action: "reject",
   *                  operation: "signSolTransaction",
   *                  criteria: [
   *                    {
   *                      type: "splValue",
   *                      splValue: "1000000", // SPL token amount
   *                      operator: ">=",
   *                    },
   *                    {
   *                      type: "mintAddress",
   *                      addresses: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"], // USDC mint
   *                      operator: "in",
   *                    },
   *                  ],
   *                },
   *              ],
   *            },
   *          });
   *          ```
   *
   * @example **With idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // This operation is idempotent with the key
   *          await cdp.policies.updatePolicy({
   *            id: "__ID__",
   *            policy: {
   *              description: "Modified Policy",
   *              rules: { ... }
   *            },
   *            idempotencyKey
   *          });
   *          ```
   */
  async updatePolicy(options: UpdatePolicyOptions): Promise<Policy> {
    Analytics.trackAction({
      action: "update_policy",
    });

    UpdatePolicyBodySchema.parse(options.policy);
    return CdpOpenApiClient.updatePolicy(
      options.id,
      // There are arbitrary differences between the abitype Abi and the openapi Abi
      options.policy as UpdatePolicyBody,
      options.idempotencyKey,
    ) as Promise<Policy>;
  }
}
