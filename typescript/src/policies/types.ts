import { z } from "zod";

import {
  PrepareUserOperationRuleSchema,
  SendEvmTransactionRuleSchema,
  SignEvmHashRuleSchema,
  SignEvmMessageRuleSchema,
  SignEvmTransactionRuleSchema,
  SignEvmTypedDataRuleSchema,
  SendUserOperationRuleSchema,
} from "./evmSchema.js";
import {
  SendSolTransactionRuleSchema,
  SignSolTransactionRuleSchema,
  SignSolMessageRuleSchema,
} from "./solanaSchema.js";

/**
 * A single Policy that can be used to govern the behavior of projects and accounts.
 */
export type Policy = {
  /** The unique identifier for the policy. */
  id: string;
  /** An optional human-readable description of the policy. */
  description?: string;
  /** The scope of the policy. Only one project-level policy can exist at any time. */
  scope: PolicyScope;
  /** A list of rules that comprise the policy. */
  rules: Rule[];
  /** The ISO 8601 timestamp at which the Policy was created. */
  createdAt: string;
  /** The ISO 8601 timestamp at which the Policy was last updated. */
  updatedAt: string;
};

/**
 * Enum for policy scopes
 */
export const PolicyScopeEnum = z.enum(["project", "account"]);
/**
 * Type representing the scope of a policy.
 * Determines whether the policy applies at the project level or account level.
 */
export type PolicyScope = z.infer<typeof PolicyScopeEnum>;

/**
 * Schema for policy rules
 */
export const RuleSchema = z.discriminatedUnion("operation", [
  SignEvmTransactionRuleSchema,
  SignEvmHashRuleSchema,
  SignEvmMessageRuleSchema,
  SignEvmTypedDataRuleSchema,
  SendEvmTransactionRuleSchema,
  SignSolTransactionRuleSchema,
  SendSolTransactionRuleSchema,
  SignSolMessageRuleSchema,
  PrepareUserOperationRuleSchema,
  SendUserOperationRuleSchema,
]);

/**
 * Type representing a policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export type Rule = z.infer<typeof RuleSchema>;

/**
 * Schema for creating or updating a Policy.
 */
export const CreatePolicyBodySchema = z.object({
  /**
   * The scope of the policy.
   * "project" applies to the entire project, "account" applies to specific accounts.
   */
  scope: PolicyScopeEnum,
  /**
   * An optional human-readable description for the policy.
   * Limited to 50 characters of alphanumeric characters, spaces, commas, and periods.
   */
  description: z
    .string()
    .regex(/^[A-Za-z0-9 ,.]{1,50}$/)
    .optional(),
  /**
   * Array of rules that comprise the policy.
   * Limited to a maximum of 10 rules per policy.
   */
  rules: z.array(RuleSchema).max(10).min(1),
});
/**
 * Type representing the request body for creating a new policy.
 * Contains the scope, optional description, and rules for the policy.
 */
export type CreatePolicyBody = z.infer<typeof CreatePolicyBodySchema>;

export const UpdatePolicyBodySchema = z.object({
  /**
   * An optional human-readable description for the policy.
   * Limited to 50 characters of alphanumeric characters, spaces, commas, and periods.
   */
  description: z
    .string()
    .regex(/^[A-Za-z0-9 ,.]{1,50}$/)
    .optional(),
  /**
   * Array of rules that comprise the policy.
   * Limited to a maximum of 10 rules per policy.
   */
  rules: z.array(RuleSchema).max(10).min(1),
});
/**
 * Type representing the request body for updating an existing policy.
 * Contains the optional description and rules for the updated policy.
 * Note that the scope cannot be changed once a policy is created.
 */
export type UpdatePolicyBody = z.infer<typeof UpdatePolicyBodySchema>;
