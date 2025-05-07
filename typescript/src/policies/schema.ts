import { Address } from "abitype/zod";
import { z } from "zod";

/**
 * Enum for EthValueOperator values
 */
export const EthValueOperatorEnum = z.enum([">", ">=", "<", "<=", "=="]);
/**
 * Type representing the operators that can be used for ETH value comparisons.
 * These operators determine how transaction values are compared against thresholds.
 */
export type EthValueOperator = z.infer<typeof EthValueOperatorEnum>;

/**
 * Enum for EvmAddressOperator values
 */
export const EvmAddressOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for EVM address comparisons.
 * These operators determine how transaction recipient addresses are evaluated against a list.
 */
export type EvmAddressOperator = z.infer<typeof EvmAddressOperatorEnum>;

/**
 * Enum for SolAddressOperator values
 */
export const SolAddressOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for Solana address comparisons.
 * These operators determine how transaction addresses are evaluated against a list.
 */
export type SolAddressOperator = z.infer<typeof SolAddressOperatorEnum>;

/**
 * Schema for ETH value criterions
 */
export const EthValueCriterionSchema = z.object({
  /** The type of criterion, must be "ethValue" for Ethereum value-based rules. */
  type: z.literal("ethValue"),
  /**
   * The ETH value amount in wei to compare against, as a string.
   * Must contain only digits.
   */
  ethValue: z.string().regex(/^[0-9]+$/),
  /** The comparison operator to use for evaluating transaction values against the threshold. */
  operator: EthValueOperatorEnum,
});
export type EthValueCriterion = z.infer<typeof EthValueCriterionSchema>;

/**
 * Schema for EVM address criterions
 */
export const EvmAddressCriterionSchema = z.object({
  /** The type of criterion, must be "evmAddress" for EVM address-based rules. */
  type: z.literal("evmAddress"),
  /**
   * Array of EVM addresses to compare against.
   * Each address must be a 0x-prefixed 40-character hexadecimal string.
   * Limited to a maximum of 100 addresses per criterion.
   */
  addresses: z.array(Address).max(100),
  /**
   * The operator to use for evaluating transaction addresses.
   * "in" checks if an address is in the provided list.
   * "not in" checks if an address is not in the provided list.
   */
  operator: EvmAddressOperatorEnum,
});
export type EvmAddressCriterion = z.infer<typeof EvmAddressCriterionSchema>;

/**
 * Schema for Solana address criterions
 */
export const SolAddressCriterionSchema = z.object({
  /** The type of criterion, must be "solAddress" for Solana address-based rules. */
  type: z.literal("solAddress"),
  /**
   * Array of Solana addresses to compare against.
   * Each address must be a valid Base58-encoded Solana address (32-44 characters).
   */
  addresses: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)),
  /**
   * The operator to use for evaluating transaction addresses.
   * "in" checks if an address is in the provided list.
   * "not in" checks if an address is not in the provided list.
   */
  operator: SolAddressOperatorEnum,
});
export type SolAddressCriterion = z.infer<typeof SolAddressCriterionSchema>;

/**
 * Schema for criteria used in SignEvmTransaction operations
 */
export const SignEvmTransactionCriteriaSchema = z
  .array(z.discriminatedUnion("type", [EthValueCriterionSchema, EvmAddressCriterionSchema]))
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the signEvmTransaction operation.
 * Can contain up to 10 individual criterion objects of ETH value or EVM address types.
 */
export type SignEvmTransactionCriteria = z.infer<typeof SignEvmTransactionCriteriaSchema>;

/**
 * Schema for criteria used in SignSolTransaction operations
 */
export const SignSolTransactionCriteriaSchema = z
  .array(z.discriminatedUnion("type", [SolAddressCriterionSchema]))
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the signSolTransaction operation.
 * Can contain up to 10 individual Solana address criterion objects.
 */
export type SignSolTransactionCriteria = z.infer<typeof SignSolTransactionCriteriaSchema>;

/**
 * Enum for Solana Operation types
 */
export const SolOperationEnum = z.enum(["signSolTransaction"]);
/**
 * Type representing the operations that can be governed by a policy.
 * Defines what Solana operations the policy applies to.
 */
export type SolOperation = z.infer<typeof SolOperationEnum>;

/**
 * Enum for Evm Operation types
 */
export const EvmOperationEnum = z.enum(["signEvmTransaction"]);
/**
 * Type representing the operations that can be governed by a policy.
 * Defines what EVM operations the policy applies to.
 */
export type EvmOperation = z.infer<typeof EvmOperationEnum>;

/**
 * Enum for Action types
 */
export const ActionEnum = z.enum(["reject", "accept"]);
/**
 * Type representing the possible policy actions.
 * Determines whether matching the rule will cause a request to be accepted or rejected.
 */
export type Action = z.infer<typeof ActionEnum>;

/**
 * Type representing a 'signEvmTransaction' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SignEvmTransactionRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the transaction, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "signEvmTransaction".
   */
  operation: z.literal("signEvmTransaction"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SignEvmTransactionCriteriaSchema,
});
export type SignEvmTransactionRule = z.infer<typeof SignEvmTransactionRuleSchema>;

/**
 * Type representing a 'signSolTransaction' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SignSolTransactionRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the transaction, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "signSolTransaction".
   */
  operation: z.literal("signSolTransaction"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SignSolTransactionCriteriaSchema,
});
export type SignSolTransactionRule = z.infer<typeof SignSolTransactionRuleSchema>;

/**
 * Schema for policy rules
 */
export const RuleSchema = z.discriminatedUnion("operation", [
  SignEvmTransactionRuleSchema,
  SignSolTransactionRuleSchema,
]);

/**
 * Type representing a policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export type Rule = z.infer<typeof RuleSchema>;

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
