import { z } from "zod";

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
 * Enum for SolAddressOperator values
 */
export const SolAddressOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for Solana address comparisons.
 * These operators determine how transaction addresses are evaluated against a list.
 */
export type SolAddressOperator = z.infer<typeof SolAddressOperatorEnum>;

/**
 * Enum for SolValueOperator values
 */
export const SolValueOperatorEnum = z.enum([">", ">=", "<", "<=", "=="]);
/**
 * Type representing the operators that can be used for SOL value comparisons.
 * These operators determine how transaction SOL values are compared against thresholds.
 */
export type SolValueOperator = z.infer<typeof SolValueOperatorEnum>;

/**
 * Enum for SplAddressOperator values
 */
export const SplAddressOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for SPL address comparisons.
 * These operators determine how SPL token transfer recipient addresses are evaluated against a list.
 */
export type SplAddressOperator = z.infer<typeof SplAddressOperatorEnum>;

/**
 * Enum for SplValueOperator values
 */
export const SplValueOperatorEnum = z.enum([">", ">=", "<", "<=", "=="]);
/**
 * Type representing the operators that can be used for SPL token value comparisons.
 * These operators determine how SPL token values are compared against thresholds.
 */
export type SplValueOperator = z.infer<typeof SplValueOperatorEnum>;

/**
 * Enum for MintAddressOperator values
 */
export const MintAddressOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for mint address comparisons.
 * These operators determine how token mint addresses are evaluated against a list.
 */
export type MintAddressOperator = z.infer<typeof MintAddressOperatorEnum>;

/**
 * Enum for ProgramIdOperator values
 */
export const ProgramIdOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for program ID comparisons.
 * These operators determine how transaction program IDs are evaluated against a list.
 */
export type ProgramIdOperator = z.infer<typeof ProgramIdOperatorEnum>;

/**
 * Enum for SolNetworkOperator values
 */
export const SolNetworkOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for Solana network comparisons.
 * These operators determine how transaction networks are evaluated against a list.
 */
export type SolNetworkOperator = z.infer<typeof SolNetworkOperatorEnum>;

/**
 * Enum for supported Solana networks
 */
export const SolNetworkEnum = z.enum(["solana-devnet", "solana"]);
/**
 * Type representing the supported Solana networks.
 */
export type SolNetwork = z.infer<typeof SolNetworkEnum>;

/**
 * Enum for KnownIdlType values
 */
export const KnownIdlTypeEnum = z.enum(["SystemProgram", "TokenProgram", "AssociatedTokenProgram"]);
/**
 * Type representing known Solana programs that have established IDL specifications.
 * These programs can be referenced directly by name in policy rules.
 */
export type KnownIdlType = z.infer<typeof KnownIdlTypeEnum>;

/**
 * Schema for IDL specifications following Anchor's IDL format v0.30+
 */
export const IdlSchema = z
  .object({
    /** The program address */
    address: z.string(),
    /** Array of instruction specifications */
    instructions: z.array(z.any()),
  })
  .passthrough();
export type Idl = z.infer<typeof IdlSchema>;

/**
 * Enum for SolDataParameterOperator values
 */
export const SolDataParameterOperatorEnum = z.enum([">", ">=", "<", "<=", "=="]);
/**
 * Type representing the operators that can be used for Solana data parameter comparisons.
 */
export type SolDataParameterOperator = z.infer<typeof SolDataParameterOperatorEnum>;

/**
 * Enum for SolDataParameterListOperator values
 */
export const SolDataParameterListOperatorEnum = z.enum(["in", "not in"]);
/**
 * Type representing the operators that can be used for Solana data parameter list comparisons.
 */
export type SolDataParameterListOperator = z.infer<typeof SolDataParameterListOperatorEnum>;

/**
 * Schema for Solana data parameter conditions (single value)
 */
export const SolDataParameterConditionSchema = z.object({
  /** The parameter name */
  name: z.string(),
  /** The operator to use for the comparison */
  operator: SolDataParameterOperatorEnum,
  /** The value to compare against */
  value: z.string(),
});
export type SolDataParameterCondition = z.infer<typeof SolDataParameterConditionSchema>;

/**
 * Schema for Solana data parameter conditions (list values)
 */
export const SolDataParameterConditionListSchema = z.object({
  /** The parameter name */
  name: z.string(),
  /** The operator to use for the comparison */
  operator: SolDataParameterListOperatorEnum,
  /** The values to compare against */
  values: z.array(z.string()),
});
export type SolDataParameterConditionList = z.infer<typeof SolDataParameterConditionListSchema>;

/**
 * Schema for Solana data conditions
 */
export const SolDataConditionSchema = z.object({
  /** The instruction name */
  instruction: z.string(),
  /** Parameter conditions for the instruction */
  params: z
    .array(z.union([SolDataParameterConditionSchema, SolDataParameterConditionListSchema]))
    .optional(),
});
export type SolDataCondition = z.infer<typeof SolDataConditionSchema>;

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
 * Schema for SOL value criterions
 */
export const SolValueCriterionSchema = z.object({
  /** The type of criterion, must be "solValue" for SOL value-based rules. */
  type: z.literal("solValue"),
  /**
   * The SOL value amount in lamports to compare against, as a string.
   * Must contain only digits.
   */
  solValue: z.string().regex(/^[0-9]+$/),
  /** The comparison operator to use for evaluating transaction SOL values against the threshold. */
  operator: SolValueOperatorEnum,
});
export type SolValueCriterion = z.infer<typeof SolValueCriterionSchema>;

/**
 * Schema for SPL address criterions
 */
export const SplAddressCriterionSchema = z.object({
  /** The type of criterion, must be "splAddress" for SPL address-based rules. */
  type: z.literal("splAddress"),
  /**
   * Array of Solana addresses to compare against for SPL token transfer recipients.
   * Each address must be a valid Base58-encoded Solana address (32-44 characters).
   */
  addresses: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)),
  /**
   * The operator to use for evaluating SPL token transfer recipient addresses.
   * "in" checks if an address is in the provided list.
   * "not in" checks if an address is not in the provided list.
   */
  operator: SplAddressOperatorEnum,
});
export type SplAddressCriterion = z.infer<typeof SplAddressCriterionSchema>;

/**
 * Schema for SPL value criterions
 */
export const SplValueCriterionSchema = z.object({
  /** The type of criterion, must be "splValue" for SPL token value-based rules. */
  type: z.literal("splValue"),
  /**
   * The SPL token value amount to compare against, as a string.
   * Must contain only digits.
   */
  splValue: z.string().regex(/^[0-9]+$/),
  /** The comparison operator to use for evaluating SPL token values against the threshold. */
  operator: SplValueOperatorEnum,
});
export type SplValueCriterion = z.infer<typeof SplValueCriterionSchema>;

/**
 * Schema for mint address criterions
 */
export const MintAddressCriterionSchema = z.object({
  /** The type of criterion, must be "mintAddress" for token mint address-based rules. */
  type: z.literal("mintAddress"),
  /**
   * Array of Solana addresses to compare against for token mint addresses.
   * Each address must be a valid Base58-encoded Solana address (32-44 characters).
   */
  addresses: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)),
  /**
   * The operator to use for evaluating token mint addresses.
   * "in" checks if an address is in the provided list.
   * "not in" checks if an address is not in the provided list.
   */
  operator: MintAddressOperatorEnum,
});
export type MintAddressCriterion = z.infer<typeof MintAddressCriterionSchema>;

/**
 * Schema for Solana data criterions
 */
export const SolDataCriterionSchema = z.object({
  /** The type of criterion, must be "solData" for Solana data-based rules. */
  type: z.literal("solData"),
  /**
   * List of IDL specifications. Can contain known program names (strings) or custom IDL objects.
   */
  idls: z.array(z.union([KnownIdlTypeEnum, IdlSchema])),
  /**
   * A list of conditions to apply against the transaction instruction.
   * Only one condition must evaluate to true for this criterion to be met.
   */
  conditions: z.array(SolDataConditionSchema),
});
export type SolDataCriterion = z.infer<typeof SolDataCriterionSchema>;

/**
 * Schema for program ID criterions
 */
export const ProgramIdCriterionSchema = z.object({
  /** The type of criterion, must be "programId" for program ID-based rules. */
  type: z.literal("programId"),
  /**
   * Array of Solana program IDs to compare against.
   * Each program ID must be a valid Base58-encoded Solana address (32-44 characters).
   */
  programIds: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)),
  /**
   * The operator to use for evaluating transaction program IDs.
   * "in" checks if a program ID is in the provided list.
   * "not in" checks if a program ID is not in the provided list.
   */
  operator: ProgramIdOperatorEnum,
});
export type ProgramIdCriterion = z.infer<typeof ProgramIdCriterionSchema>;

/**
 * Schema for Solana network criterions
 */
export const SolNetworkCriterionSchema = z.object({
  /** The type of criterion, must be "solNetwork" for network-based rules. */
  type: z.literal("solNetwork"),
  /**
   * Array of Solana networks to compare against.
   */
  networks: z.array(SolNetworkEnum),
  /**
   * The operator to use for evaluating transaction network.
   * "in" checks if the network is in the provided list.
   * "not in" checks if the network is not in the provided list.
   */
  operator: SolNetworkOperatorEnum,
});
export type SolNetworkCriterion = z.infer<typeof SolNetworkCriterionSchema>;

/**
 * Schema for Solana message criterions
 */
export const SolMessageCriterionSchema = z.object({
  /** The type of criterion, must be "solMessage" for message-based rules. */
  type: z.literal("solMessage"),
  /**
   * A regular expression pattern to match against the message.
   */
  match: z.string(),
});
export type SolMessageCriterion = z.infer<typeof SolMessageCriterionSchema>;

/**
 * Schema for criteria used in SignSolTransaction operations
 */
export const SignSolTransactionCriteriaSchema = z
  .array(
    z.discriminatedUnion("type", [
      SolAddressCriterionSchema,
      SolValueCriterionSchema,
      SplAddressCriterionSchema,
      SplValueCriterionSchema,
      MintAddressCriterionSchema,
      SolDataCriterionSchema,
      ProgramIdCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the signSolTransaction operation.
 * Can contain up to 10 individual criterion objects for Solana addresses, SOL values, SPL addresses, SPL values, mint addresses, Solana data, and program IDs.
 */
export type SignSolTransactionCriteria = z.infer<typeof SignSolTransactionCriteriaSchema>;

/**
 * Schema for criteria used in SendSolTransaction operations
 */
export const SendSolTransactionCriteriaSchema = z
  .array(
    z.discriminatedUnion("type", [
      SolAddressCriterionSchema,
      SolValueCriterionSchema,
      SplAddressCriterionSchema,
      SplValueCriterionSchema,
      MintAddressCriterionSchema,
      SolDataCriterionSchema,
      ProgramIdCriterionSchema,
      SolNetworkCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the sendSolTransaction operation.
 * Can contain up to 10 individual criterion objects for Solana addresses, SOL values, SPL addresses, SPL values, mint addresses, Solana data, program IDs, and network restrictions.
 */
export type SendSolTransactionCriteria = z.infer<typeof SendSolTransactionCriteriaSchema>;

/**
 * Enum for Solana Operation types
 */
export const SolOperationEnum = z.enum([
  "signSolTransaction",
  "sendSolTransaction",
  "signSolMessage",
]);
/**
 * Type representing the operations that can be governed by a policy.
 * Defines what Solana operations the policy applies to.
 */
export type SolOperation = z.infer<typeof SolOperationEnum>;

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
 * Type representing a 'sendSolTransaction' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SendSolTransactionRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the transaction, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "sendSolTransaction".
   */
  operation: z.literal("sendSolTransaction"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SendSolTransactionCriteriaSchema,
});
export type SendSolTransactionRule = z.infer<typeof SendSolTransactionRuleSchema>;

/**
 * Schema for criteria used in SignSolMessage operations
 */
export const SignSolMessageCriteriaSchema = z.array(SolMessageCriterionSchema).max(10).min(1);
/**
 * Type representing a set of criteria for the signSolMessage operation.
 * Can contain up to 10 individual criterion objects for Solana message matching.
 */
export type SignSolMessageCriteria = z.infer<typeof SignSolMessageCriteriaSchema>;

/**
 * Type representing a 'signSolMessage' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SignSolMessageRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the message signing, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "signSolMessage".
   */
  operation: z.literal("signSolMessage"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SignSolMessageCriteriaSchema,
});
export type SignSolMessageRule = z.infer<typeof SignSolMessageRuleSchema>;
