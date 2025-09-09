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
   * Limited to a maximum of 300 addresses per criterion.
   */
  addresses: z.array(Address).max(300),
  /**
   * The operator to use for evaluating transaction addresses.
   * "in" checks if an address is in the provided list.
   * "not in" checks if an address is not in the provided list.
   */
  operator: EvmAddressOperatorEnum,
});
export type EvmAddressCriterion = z.infer<typeof EvmAddressCriterionSchema>;

/**
 * Enum for  PrepareUserOperation EVM Network values
 */
export const PrepareUserOperationEvmNetworkEnum = z.enum([
  "base-sepolia",
  "base",
  "arbitrum",
  "optimism",
  "zora",
  "polygon",
  "bnb",
  "avalanche",
  "ethereum",
  "ethereum-sepolia",
]);

export type PrepareUserOperationEvmNetwork = z.infer<typeof PrepareUserOperationEvmNetworkEnum>;

/**
 * Enum for SendEvmTransaction EVM Network values
 */
export const SendEvmTransactionEvmNetworkEnum = z.enum([
  "base",
  "base-sepolia",
  "ethereum",
  "ethereum-sepolia",
  "avalanche",
  "polygon",
  "optimism",
  "arbitrum",
]);

/**
 * Type representing the valid networks used with CDP transaction API's.
 */
export type EvmNetwork = z.ZodUnion<
  [typeof SendEvmTransactionEvmNetworkEnum, typeof PrepareUserOperationEvmNetworkEnum]
>;

/**
 * Schema for EVM network criterions
 */
export const SendEvmTransactionEvmNetworkCriterionSchema = z.object({
  /** The type of criterion, must be "evmAddress" for EVM address-based rules. */
  type: z.literal("evmNetwork"),
  /**
   * Array of EVM network identifiers to compare against.
   * Either "base", "base-sepolia", "ethereum", "ethereum-sepolia", "avalanche", "polygon", "optimism", "arbitrum"
   */
  networks: z.array(SendEvmTransactionEvmNetworkEnum),
  /**
   * The operator to use for evaluating transaction network.
   * "in" checks if a network is in the provided list.
   * "not in" checks if a network is not in the provided list.
   */
  operator: EvmNetworkOperatorEnum,
});

export const PrepareUserOperationEvmNetworkCriterionSchema = z.object({
  /** The type of criterion, must be "evmAddress" for EVM address-based rules. */
  type: z.literal("evmNetwork"),
  /**
   * Array of EVM network identifiers to compare against.
   * Either "base-sepolia", "base", "arbitrum", "optimism", "zora", "polygon", "bnb", "avalanche", "ethereum", "ethereum-sepolia"
   */
  networks: z.array(PrepareUserOperationEvmNetworkEnum),
  /**
   * The operator to use for evaluating transaction network.
   * "in" checks if a network is in the provided list.
   * "not in" checks if a network is not in the provided list.
   */
  operator: EvmNetworkOperatorEnum,
});

export const EvmNetworkCriterionSchema = z.union([
  SendEvmTransactionEvmNetworkCriterionSchema,
  PrepareUserOperationEvmNetworkCriterionSchema,
]);

export type EvmNetworkCriterion = z.ZodUnion<
  [
    typeof SendEvmTransactionEvmNetworkCriterionSchema,
    typeof PrepareUserOperationEvmNetworkCriterionSchema,
  ]
>;

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
 * Schema for Net USD change criterion
 */
export const NetUSDChangeCriterionSchema = z.object({
  /** The type of criterion, must be "netUSDChange" for USD denominated asset transfer rules. */
  type: z.literal("netUSDChange"),
  /**
   * The amount of USD, in cents, that the total USD value of a transaction's asset transfer and exposure should be compared to.
   */
  changeCents: z.number().int().nonnegative(),
  /**
   * The operator to use for the comparison. The total value of a transaction's asset transfer and exposure in USD will be on the left-hand side of the operator, and the `changeCents` field will be on the right-hand side.
   */
  operator: EthValueOperatorEnum,
});
export type NetUSDChangeCriterion = z.infer<typeof NetUSDChangeCriterionSchema>;

/**
 * Schema for EVM typed address conditions
 */
export const EvmTypedAddressConditionSchema = z.object({
  /**
   * Array of EVM addresses to compare against.
   * Each address must be a 0x-prefixed 40-character hexadecimal string.
   * Limited to a maximum of 300 addresses per condition.
   */
  addresses: z.array(Address).max(300),
  /**
   * The operator to use for evaluating addresses.
   * "in" checks if an address is in the provided list.
   * "not in" checks if an address is not in the provided list.
   */
  operator: EvmAddressOperatorEnum,
  /**
   * The path to the field to compare against this criterion.
   * To reference deeply nested fields, use dot notation (e.g., "order.buyer").
   */
  path: z.string().min(1),
});
export type EvmTypedAddressCondition = z.infer<typeof EvmTypedAddressConditionSchema>;

/**
 * Schema for EVM typed numerical conditions
 */
export const EvmTypedNumericalConditionSchema = z.object({
  /**
   * The numerical value to compare against, as a string.
   * Must contain only digits.
   */
  value: z.string().regex(/^[0-9]+$/),
  /**
   * The comparison operator to use.
   */
  operator: EthValueOperatorEnum,
  /**
   * The path to the field to compare against this criterion.
   * To reference deeply nested fields, use dot notation (e.g., "order.price").
   */
  path: z.string().min(1),
});
export type EvmTypedNumericalCondition = z.infer<typeof EvmTypedNumericalConditionSchema>;

/**
 * Schema for EVM typed string conditions
 */
export const EvmTypedStringConditionSchema = z.object({
  /**
   * A regular expression the string field is matched against.
   * Accepts valid regular expression syntax described by [RE2](https://github.com/google/re2/wiki/Syntax).
   */
  match: z.string().min(1),
  /**
   * The path to the field to compare against this criterion.
   * To reference deeply nested fields, use dot notation (e.g., "metadata.description").
   */
  path: z.string().min(1),
});
export type EvmTypedStringCondition = z.infer<typeof EvmTypedStringConditionSchema>;

/**
 * Schema for SignEvmTypedData field criterion
 */
export const SignEvmTypedDataFieldCriterionSchema = z.object({
  /** The type of criterion, must be "evmTypedDataField" for typed data field-based rules. */
  type: z.literal("evmTypedDataField"),
  /**
   * The EIP-712 type definitions for the typed data.
   * Must include at minimum the primary type being signed.
   */
  types: z.object({
    /**
     * EIP-712 compliant map of model names to model definitions.
     */
    types: z.record(
      z.array(
        z.object({
          name: z.string(),
          type: z.string(),
        }),
      ),
    ),
    /**
     * The name of the root EIP-712 type. This value must be included in the `types` object.
     */
    primaryType: z.string(),
  }),
  /**
   * Array of conditions to apply against typed data fields.
   * Each condition specifies how to validate a specific field within the typed data.
   */
  conditions: z
    .array(
      z.union([
        EvmTypedAddressConditionSchema,
        EvmTypedNumericalConditionSchema,
        EvmTypedStringConditionSchema,
      ]),
    )
    .min(1),
});
export type SignEvmTypedDataFieldCriterion = z.infer<typeof SignEvmTypedDataFieldCriterionSchema>;

/**
 * Schema for SignEvmTypedData verifying contract criterion
 */
export const SignEvmTypedDataVerifyingContractCriterionSchema = z.object({
  /** The type of criterion, must be "evmTypedDataVerifyingContract" for verifying contract-based rules. */
  type: z.literal("evmTypedDataVerifyingContract"),
  /**
   * Array of EVM addresses allowed or disallowed as verifying contracts.
   * Each address must be a 0x-prefixed 40-character hexadecimal string.
   * Limited to a maximum of 300 addresses per criterion.
   */
  addresses: z.array(Address).max(300),
  /**
   * The operator to use for evaluating verifying contract addresses.
   * "in" checks if the verifying contract is in the provided list.
   * "not in" checks if the verifying contract is not in the provided list.
   */
  operator: EvmAddressOperatorEnum,
});
export type SignEvmTypedDataVerifyingContractCriterion = z.infer<
  typeof SignEvmTypedDataVerifyingContractCriterionSchema
>;

/**
 * Schema for criteria used in SignEvmTypedData operations
 */
export const SignEvmTypedDataCriteriaSchema = z
  .array(
    z.discriminatedUnion("type", [
      SignEvmTypedDataFieldCriterionSchema,
      SignEvmTypedDataVerifyingContractCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the signEvmTypedData operation.
 * Can contain up to 10 individual criterion objects for typed data field or verifying contract checks.
 */
export type SignEvmTypedDataCriteria = z.infer<typeof SignEvmTypedDataCriteriaSchema>;

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
 * Schema for criteria used in SignEvmTransaction operations
 */
export const SignEvmTransactionCriteriaSchema = z
  .array(
    z.discriminatedUnion("type", [
      EthValueCriterionSchema,
      EvmAddressCriterionSchema,
      EvmDataCriterionSchema,
      NetUSDChangeCriterionSchema,
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
      SendEvmTransactionEvmNetworkCriterionSchema,
      EvmDataCriterionSchema,
      NetUSDChangeCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);

// Type representing a set of criteria for the sendEvmTransaction operation. Can contain up to 10 individual criterion objects of ETH value or EVM address types.
export type SendEvmTransactionCriteria = z.infer<typeof SendEvmTransactionCriteriaSchema>;

/**
 * Schema for criteria used in PrepareUserOperation operations
 */
export const PrepareUserOperationCriteriaSchema = z
  .array(
    z.discriminatedUnion("type", [
      EthValueCriterionSchema,
      EvmAddressCriterionSchema,
      PrepareUserOperationEvmNetworkCriterionSchema,
      EvmDataCriterionSchema,
      NetUSDChangeCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the prepareUserOperation operation.
 * Can contain up to 10 individual criterion objects of ETH value, EVM address, EVM network, or EVM data types.
 */
export type PrepareUserOperationCriteria = z.infer<typeof PrepareUserOperationCriteriaSchema>;

/**
 * Schema for criteria used in SendUserOperation operations
 */
export const SendUserOperationCriteriaSchema = z
  .array(
    z.discriminatedUnion("type", [
      EthValueCriterionSchema,
      EvmAddressCriterionSchema,
      EvmDataCriterionSchema,
      NetUSDChangeCriterionSchema,
    ]),
  )
  .max(10)
  .min(1);
/**
 * Type representing a set of criteria for the sendUserOperation operation.
 * Can contain up to 10 individual criterion objects of ETH value, EVM address, or EVM data types.
 */
export type SendUserOperationCriteria = z.infer<typeof SendUserOperationCriteriaSchema>;

/**
 * Enum for Evm Operation types
 */
export const EvmOperationEnum = z.enum([
  "signEvmTransaction",
  "sendEvmTransaction",
  "signEvmMessage",
  "signEvmTypedData",
  "signEvmHash",
  "prepareUserOperation",
  "sendUserOperation",
]);
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
 * Type representing a 'signEvmTypedData' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SignEvmTypedDataRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the signing, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "signEvmTypedData".
   */
  operation: z.literal("signEvmTypedData"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SignEvmTypedDataCriteriaSchema,
});
export type SignEvmTypedDataRule = z.infer<typeof SignEvmTypedDataRuleSchema>;

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
 * Type representing a 'prepareUserOperation' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const PrepareUserOperationRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the operation, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "prepareUserOperation".
   */
  operation: z.literal("prepareUserOperation"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: PrepareUserOperationCriteriaSchema,
});
export type PrepareUserOperationRule = z.infer<typeof PrepareUserOperationRuleSchema>;

/**
 * Type representing a 'sendUserOperation' policy rule that can accept or reject specific operations
 * based on a set of criteria.
 */
export const SendUserOperationRuleSchema = z.object({
  /**
   * Determines whether matching the rule will cause a request to be rejected or accepted.
   * "accept" will allow the operation, "reject" will block it.
   */
  action: ActionEnum,
  /**
   * The operation to which this rule applies.
   * Must be "sendUserOperation".
   */
  operation: z.literal("sendUserOperation"),
  /**
   * The set of criteria that must be matched for this rule to apply.
   * Must be compatible with the specified operation type.
   */
  criteria: SendUserOperationCriteriaSchema,
});
export type SendUserOperationRule = z.infer<typeof SendUserOperationRuleSchema>;
