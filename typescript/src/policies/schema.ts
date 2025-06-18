import { Abi, Address } from "abitype/zod";
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
 * Enum for EvmNetworkOperator values
 */
export const EvmNetworkOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for EVM network comparisons.
 * These operators determine how the transaction's network is evaluated against a list.
 */
export type EvmNetworkOperator = z.infer<typeof EvmNetworkOperatorEnum>;

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
 * Enum for EVM Network values
 */
export const EvmNetworkEnum = z.enum(["base", "base-sepolia"]);
/**
 * Type representing the valid networks used with CDP transaction API's.
 */
export type EvmNetwork = z.infer<typeof EvmNetworkEnum>;

/**
 * Schema for EVM network criterions
 */
export const EvmNetworkCriterionSchema = z.object({
  /** The type of criterion, must be "evmAddress" for EVM address-based rules. */
  type: z.literal("evmNetwork"),
  /**
   * Array of EVM network identifiers to compare against.
   * Either "base" or "base-sepolia"
   */
  networks: z.array(EvmNetworkEnum),
  /**
   * The operator to use for evaluating transaction network.
   * "in" checks if a network is in the provided list.
   * "not in" checks if a network is not in the provided list.
   */
  operator: EvmNetworkOperatorEnum,
});
export type EvmNetworkCriterion = z.infer<typeof EvmNetworkCriterionSchema>;

/**
 * Schema for EVM message criterions
 */
export const EvmMessageCriterionSchema = z.object({
  /** The type of criterion, must be "evmMessage" for EVM message-based rules. */
  type: z.literal("evmMessage"),
  /**
   * A regular expression the message is matched against.
   * Accepts valid regular expression syntax described by [RE2](https://github.com/google/re2/wiki/Syntax).
   */
  match: z.string().min(1),
});
export type EvmMessageCriterion = z.infer<typeof EvmMessageCriterionSchema>;

/**
 * A list of comparables to apply against encoded arguments in the transaction's `data` field.
 */
export const EvmDataParameterConditionListSchema = z.object({
  /**
   * The name of the parameter to check against a transaction's calldata.
   * If name is unknown, or is not named, you may supply an array index, e.g., `0` for first parameter.
   */
  name: z.union([z.string().min(1), z.string().regex(/^\d+$/)]),
  /**
   * The operator to use for the comparison. The value resolved at the `name` will be on the
   * left-hand side of the operator, and the `values` field will be on the right-hand side.
   */
  operator: z.enum(["in", "not in"]),
  /**
   * Values to compare against the resolved `name` value.
   * All values are encoded as strings. Refer to the table in the documentation for how values
   * should be encoded, and which operators are supported for each type.
   */
  values: z.array(z.string()),
});
export type EvmDataParameterConditionList = z.infer<typeof EvmDataParameterConditionListSchema>;

/**
 * A single condition to apply against encoded arguments in the transaction's `data` field.
 */
export const EvmDataParameterConditionSchema = z.object({
  /**
   * The name of the parameter to check against a transaction's calldata.
   * If name is unknown, or is not named, you may supply an array index, e.g., `0` for first parameter.
   */
  name: z.union([z.string().min(1), z.string().regex(/^\d+$/)]),
  /**
   * The operator to use for the comparison. The value resolved at the `name` will be on the
   * left-hand side of the operator, and the `value` field will be on the right-hand side.
   */
  operator: EthValueOperatorEnum,
  /**
   * A single value to compare the value resolved at `name` to.
   * All values are encoded as strings. Refer to the table in the documentation for how values
   * should be encoded, and which operators are supported for each type.
   */
  value: z.string(),
});
export type EvmDataParameterCondition = z.infer<typeof EvmDataParameterConditionSchema>;

/**
 * A single condition to apply against the function and encoded arguments in the transaction's `data` field.
 * Each `parameter` configuration must be successfully evaluated against the corresponding function argument
 * in order for a policy to be accepted.
 */
export const EvmDataConditionSchema = z.object({
  /**
   * The name of a smart contract function being called.
   */
  function: z.string().min(1),
  /**
   * An optional list of parameter conditions to apply against encoded arguments in the transaction's `data` field.
   */
  params: z
    .array(z.union([EvmDataParameterConditionSchema, EvmDataParameterConditionListSchema]))
    .min(1)
    .optional(),
});
export type EvmDataCondition = z.infer<typeof EvmDataConditionSchema>;

/**
 * Schema for EVM data criterion
 */
export const EvmDataCriterionSchema = z.object({
  /** The type of criterion, must be "evmData" for EVM transaction rules. */
  type: z.literal("evmData"),
  /**
   * The ABI of the smart contract being called. This can be a partial structure with only specific functions.
   */
  abi: z.union([z.enum(["erc20", "erc721", "erc1155"]), Abi]),
  /**
   * A list of conditions to apply against the function and encoded arguments in the transaction's `data` field.
   * Each condition must be met in order for this policy to be accepted or rejected.
   */
  conditions: z.array(EvmDataConditionSchema).min(1),
});
export type EvmDataCriterion = z.infer<typeof EvmDataCriterionSchema>;

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
  .array(
    z.discriminatedUnion("type", [
      EthValueCriterionSchema,
      EvmAddressCriterionSchema,
      EvmDataCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the signEvmTransaction operation.
 * Can contain up to 10 individual criterion objects of ETH value or EVM address types.
 */
export type SignEvmTransactionCriteria = z.infer<typeof SignEvmTransactionCriteriaSchema>;

/**
 * Schema for criteria used in SignEvmMessage operations
 */
export const SignEvmMessageCriteriaSchema = z
  .array(z.discriminatedUnion("type", [EvmMessageCriterionSchema]))
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the signEvmMessage operation.
 * Can contain up to 10 individual EVM message criterion objects.
 */
export type SignEvmMessageCriteria = z.infer<typeof SignEvmMessageCriteriaSchema>;

/**
 * Schema for criteria used in SendEvmTransaction operations
 */
export const SendEvmTransactionCriteriaSchema = z
  .array(
    z.discriminatedUnion("type", [
      EthValueCriterionSchema,
      EvmAddressCriterionSchema,
      EvmNetworkCriterionSchema,
      EvmDataCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);

// Type representing a set of criteria for the sendEvmTransaction operation. Can contain up to 10 individual criterion objects of ETH value or EVM address types.
export type SendEvmTransactionCriteria = z.infer<typeof SendEvmTransactionCriteriaSchema>;

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
 * Type representing a 'signEvmHash' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SignEvmHashRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the signing, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "signEvmHash".
   */
  operation: z.literal("signEvmHash"),
});
export type SignEvmHashRule = z.infer<typeof SignEvmHashRuleSchema>;

/**
 * Type representing a 'signEvmMessage' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SignEvmMessageRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the signing, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "signEvmMessage".
   */
  operation: z.literal("signEvmMessage"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SignEvmMessageCriteriaSchema,
});
export type SignEvmMessageRule = z.infer<typeof SignEvmMessageRuleSchema>;

/**
 * Type representing a 'sendEvmTransaction' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SendEvmTransactionRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the transaction, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "sendEvmTransaction".
   */
  operation: z.literal("sendEvmTransaction"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SendEvmTransactionCriteriaSchema,
});
export type SendEvmTransactionRule = z.infer<typeof SendEvmTransactionRuleSchema>;

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
  SignEvmHashRuleSchema,
  SignEvmMessageRuleSchema,
  SendEvmTransactionRuleSchema,
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
