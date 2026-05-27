/**
 * @module Types
 */

import { OpenApiPoliciesMethods } from "../../openapi-client/index.js";
import { CreatePolicyBody, Policy, PolicyScope, UpdatePolicyBody } from "../../policies/types.js";

/**
 * The PoliciesClient type, where all OpenApiPoliciesMethods methods are wrapped.
 */
export type PoliciesClientInterface = Omit<
  typeof OpenApiPoliciesMethods,
  | "createPolicy" // mapped to createPolicy
  | "listPolicies" // mapped to listPolicies
  | "getPolicyById" // mapped to getPolicyById
  | "deletePolicy" // mapped to deletePolicy
  | "updatePolicy" // mapped to updatePolicy
> & {
  listPolicies: (options: ListPoliciesOptions) => Promise<ListPoliciesResult>;
  createPolicy: (options: CreatePolicyOptions) => Promise<Policy>;
  getPolicyById: (options: GetPolicyByIdOptions) => Promise<Policy>;
  deletePolicy: (options: DeletePolicyOptions) => Promise<void>;
  updatePolicy: (options: UpdatePolicyOptions) => Promise<Policy>;
};

export interface ListPoliciesOptions {
  /** The page size to paginate through the accounts. */
  pageSize?: number;
  /** The page token to paginate through the accounts. */
  pageToken?: string;
  /**
   * The scope of the policies to return. If `project`, the response will include exactly one policy, which is the project-level policy. If `account`, the response will include all account-level policies for the developer's CDP Project.
   */
  scope?: PolicyScope;
}

/**
 * The result of listing policies.
 */
export interface ListPoliciesResult {
  /** The list of policies matching the query parameters. */
  policies: Policy[];
  /**
   * The next page token to paginate through the policies.
   * If undefined, there are no more policies to paginate through.
   */
  nextPageToken?: string;
}

/**
 * Options for creating a Policy.
 */
export interface CreatePolicyOptions {
  /**
   * The idempotency key to ensure the request is processed exactly once.
   * Used to safely retry requests without accidentally performing the same operation twice.
   */
  idempotencyKey?: string;
  /**
   * The policy definition to create.
   * Contains the scope, description, and rules for the policy.
   */
  policy: CreatePolicyBody;
}

/**
 * Options for retrieving a Policy by ID.
 */
export interface GetPolicyByIdOptions {
  /**
   * The unique identifier of the policy to retrieve.
   * This is a UUID that's generated when the policy is created.
   */
  id: string;
}

/**
 * Options for deleting a Policy.
 */
export interface DeletePolicyOptions {
  /**
   * The unique identifier of the policy to delete.
   * This is a UUID that's generated when the policy is created.
   */
  id: string;
  /**
   * The idempotency key to ensure the request is processed exactly once.
   * Used to safely retry requests without accidentally performing the same operation twice.
   */
  idempotencyKey?: string;
}

/**
 * Options for updating a Policy.
 */
export interface UpdatePolicyOptions {
  /**
   * The unique identifier of the policy to update.
   * This is a UUID that's generated when the policy is created.
   */
  id: string;
  /**
   * The updated policy definition.
   * Contains the description and rules for the policy.
   */
  policy: UpdatePolicyBody;
  /**
   * The idempotency key to ensure the request is processed exactly once.
   * Used to safely retry requests without accidentally performing the same operation twice.
   */
  idempotencyKey?: string;
}
