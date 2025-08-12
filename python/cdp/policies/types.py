# flake8: noqa: N815
# Ignoring mixed case because underlying library type uses camelCase
# flake8: noqa: N805
# Ignoring first argument of field_validator named cls

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from cdp.errors import UserInputValidationError
from cdp.openapi_client.models.abi_inner import AbiInner
from cdp.openapi_client.models.known_abi_type import KnownAbiType

"""Type representing the action of a policy rule.
Determines whether matching the rule will cause a request to be rejected or accepted."""
Action = Literal["reject", "accept"]


class EthValueCriterion(BaseModel):
    """Type representing a 'ethValue' criterion that can be used to govern the behavior of projects and accounts."""

    type: Literal["ethValue"] = Field(
        "ethValue",
        description="The type of criterion, must be 'ethValue' for Ethereum value-based rules.",
    )
    ethValue: str = Field(
        ...,
        description="The ETH value amount in wei to compare against, as a string. Must contain only digits.",
    )
    operator: Literal[">", "<", ">=", "<=", "==", "!="] = Field(
        ...,
        description="The comparison operator to use for evaluating transaction values against the threshold.",
    )

    @field_validator("ethValue")
    def validate_eth_value(cls, v: str) -> str:
        """Validate that ethValue contains only digits."""
        if not v.isdigit():
            raise UserInputValidationError("ethValue must contain only digits")
        return v


class EvmAddressCriterion(BaseModel):
    """Type representing a 'evmAddress' criterion that can be used to govern the behavior of projects and accounts."""

    type: Literal["evmAddress"] = Field(
        "evmAddress",
        description="The type of criterion, must be 'evmAddress' for EVM address-based rules.",
    )
    addresses: list[str] = Field(
        ...,
        description="The list of EVM addresses to compare against. Each address must be a 0x-prefixed 40-character hexadecimal string. Limited to a maximum of 100 addresses per criterion.",
    )
    operator: Literal["in", "not in"] = Field(
        ...,
        description="The operator to use for evaluating transaction addresses. 'in' checks if an address is in the provided list. 'not in' checks if an address is not in the provided list.",
    )

    @field_validator("addresses")
    def validate_addresses_length(cls, v):
        """Validate the number of addresses."""
        if len(v) > 300:
            raise UserInputValidationError("Maximum of 300 addresses allowed")
        return v

    @field_validator("addresses")
    def validate_addresses_format(cls, v):
        """Validate each address has 0x prefix and is correct length and format."""
        for addr in v:
            if not re.match(r"^0x[0-9a-fA-F]{40}$", addr):
                raise UserInputValidationError(
                    r"must validate the regular expression /^0x[0-9a-fA-F]{40}$/"
                )
        return v


class EvmNetworkCriterion(BaseModel):
    """Type representing a 'evmNetwork' criterion that can be used to govern the behavior of projects and accounts."""

    type: Literal["evmNetwork"] = Field(
        "evmNetwork",
        description="The type of criterion, must be 'evmNetwork' for EVM network-based rules.",
    )
    networks: list[Literal["base-sepolia", "base"]] = Field(
        ...,
        description="The list of EVM networks to compare against. Valid networks are 'base-sepolia' and 'base'.",
    )
    operator: Literal["in", "not in"] = Field(
        ...,
        description="The operator to use for evaluating transaction networks. 'in' checks if a network is in the provided list. 'not in' checks if a network is not in the provided list.",
    )


class NetUSDChangeCriterion(BaseModel):
    """Type representing a 'netUSDChange' criterion that can be used to govern the behavior of projects and accounts."""

    type: Literal["netUSDChange"] = Field(
        "netUSDChange",
        description="The type of criterion, must be 'netUSDChange' for USD denominated value restrictions.",
    )

    changeCents: int = Field(
        ...,
        ge=0,
        description="The amount of USD, in cents, that the total value of a transaction's asset transfer should be compared to.",
    )

    operator: Literal[">", ">=", "==", "<", "<="] = Field(
        ...,
        description="The operator to use for the comparison. The total value of a transaction's asset transfer will be on the left-hand side of the operator, and the `changeCents` field will be on the right-hand side.",
    )

    @field_validator("changeCents")
    def validate_change_cents(cls, v: int) -> int:
        """Validate that changeCents is a non-negative integer."""
        if v < 0:
            raise UserInputValidationError("changeCents must be a non-negative integer")
        return v


class EvmDataParameterCondition(BaseModel):
    """EVM data parameter condition."""

    name: str = Field(
        ...,
        description="The name of the parameter to check against a transaction's calldata. If name is unknown, or is not named, you may supply an array index, e.g., `0` for first parameter.",
    )
    operator: str = Field(
        ...,
        description="The operator to use for the comparison. The value resolved at the `name` will be on the left-hand side of the operator, and the `value` field will be on the right-hand side.",
    )
    value: str = Field(
        ...,
        description="A single value to compare the value resolved at `name` to. All values are encoded as strings. Refer to the table in the documentation for how values should be encoded, and which operators are supported for each type.",
    )

    @field_validator("operator")
    def validate_operator_enum(cls, value):
        """Validate the operator enum."""
        if value not in {">", ">=", "<", "<=", "=="}:
            raise UserInputValidationError(
                "must be one of enum values ('>', '>=', '<', '<=', '==')"
            )
        return value


class EvmDataParameterConditionList(BaseModel):
    """EVM data parameter condition list."""

    name: str = Field(
        ...,
        description="The name of the parameter to check against a transaction's calldata. If name is unknown, or is not named, you may supply an array index, e.g., `0` for first parameter.",
    )
    operator: str = Field(
        ...,
        description="The operator to use for the comparison. The value resolved at the `name` will be on the left-hand side of the operator, and the `values` field will be on the right-hand side.",
    )
    values: list[str] = Field(
        ...,
        description="Values to compare against the resolved `name` value. All values are encoded as strings. Refer to the table in the documentation for how values should be encoded, and which operators are supported for each type.",
    )

    @field_validator("operator")
    def validate_operator_enum(cls, value):
        """Validate the operator enum."""
        if value not in {"in", "not in"}:
            raise UserInputValidationError("must be one of enum values ('in', 'not in')")
        return value


class EvmDataCondition(BaseModel):
    """A single condition to apply against the function and encoded arguments in the transaction's `data` field. Each `parameter` configuration must be successfully evaluated against the corresponding function argument in order for a policy to be accepted."""

    function: str = Field(
        ...,
        description="The name of a smart contract function being called.",
    )
    params: None | list[EvmDataParameterCondition | EvmDataParameterConditionList] = Field(
        default=None,
        description="The path to the field to compare against this criterion. To reference deeply nested fields, use dot notation (e.g., 'order.buyer').",
    )


class EvmDataCriterion(BaseModel):
    """Type representing a 'evmData' criterion that can be used to govern the behavior of projects and accounts."""

    type: Literal["evmData"] = Field(
        "evmData",
        description="The type of criterion, must be 'evmData' for EVM transaction data rules.",
    )
    abi: KnownAbiType | AbiInner = Field(
        ...,
        description="The ABI of the smart contract being called. This can be a partial structure with only specific functions.",
    )
    conditions: list[EvmDataCondition] = Field(
        ...,
        description="A list of conditions to apply against the function and encoded arguments in the transaction's `data` field. Each condition must be met in order for this policy to be accepted or rejected.",
    )


class SendEvmTransactionRule(BaseModel):
    """Type representing a 'sendEvmTransaction' policy rule that can accept or reject specific operations based on a set of criteria."""

    action: Action = Field(
        ...,
        description="Determines whether matching the rule will cause a request to be rejected or accepted. 'accept' will allow the transaction, 'reject' will block it.",
    )
    operation: Literal["sendEvmTransaction"] = Field(
        "sendEvmTransaction",
        description="The operation to which this rule applies. Must be 'sendEvmTransaction'.",
    )
    criteria: list[
        EthValueCriterion
        | EvmAddressCriterion
        | EvmNetworkCriterion
        | EvmDataCriterion
        | NetUSDChangeCriterion
    ] = Field(
        ...,
        description="The set of criteria that must be matched for this rule to apply. Must be compatible with the specified operation type.",
    )


class SignEvmHashRule(BaseModel):
    """Type representing a 'signEvmHash' policy rule that can accept or reject specific operations."""

    action: Action = Field(
        ...,
        description="Determines whether matching the rule will cause a request to be rejected or accepted. 'accept' will allow signing, 'reject' will block it.",
    )
    operation: Literal["signEvmHash"] = Field(
        "signEvmHash",
        description="The operation to which this rule applies. Must be 'signEvmHash'.",
    )


class EvmMessageCriterion(BaseModel):
    """Type representing a 'evmMessage' criterion that can be used to govern the behavior of projects and accounts."""

    type: Literal["evmMessage"] = Field(
        "evmMessage",
        description="The type of criterion, must be 'evmMessage' for EVM message-based rules.",
    )
    match: str = Field(
        ...,
        description="A regular expression the message is matched against. Accepts valid regular expression syntax described by [RE2](https://github.com/google/re2/wiki/Syntax).",
    )


class SignEvmMessageRule(BaseModel):
    """Type representing a 'signEvmMessage' policy rule that can accept or reject specific operations based on a set of criteria."""

    action: Action = Field(
        ...,
        description="Determines whether matching the rule will cause a request to be rejected or accepted. 'accept' will allow signing, 'reject' will block it.",
    )
    operation: Literal["signEvmMessage"] = Field(
        "signEvmMessage",
        description="The operation to which this rule applies. Must be 'signEvmMessage'.",
    )
    criteria: list[EvmMessageCriterion] = Field(
        ...,
        description="The set of criteria that must be matched for this rule to apply. Must be compatible with the specified operation type.",
    )


class EvmTypedAddressCondition(BaseModel):
    """Type representing an EVM typed address condition."""

    addresses: list[str] = Field(
        ...,
        description="Array of EVM addresses to compare against. Each address must be a 0x-prefixed 40-character hexadecimal string. Limited to a maximum of 100 addresses per condition.",
    )
    operator: Literal["in", "not in"] = Field(
        ...,
        description="The operator to use for evaluating addresses. 'in' checks if an address is in the provided list. 'not in' checks if an address is not in the provided list.",
    )
    path: str = Field(
        ...,
        description="The path to the field to compare against this criterion. To reference deeply nested fields, use dot notation (e.g., 'order.buyer').",
    )

    @field_validator("addresses")
    def validate_addresses_length(cls, v):
        """Validate the number of addresses."""
        if len(v) > 300:
            raise UserInputValidationError("Maximum of 300 addresses allowed")
        return v

    @field_validator("addresses")
    def validate_addresses_format(cls, v):
        """Validate each address has 0x prefix and is correct length and format."""
        for addr in v:
            if not re.match(r"^0x[0-9a-fA-F]{40}$", addr):
                raise UserInputValidationError(
                    r"must validate the regular expression /^0x[0-9a-fA-F]{40}$/"
                )
        return v


class EvmTypedNumericalCondition(BaseModel):
    """Type representing an EVM typed numerical condition."""

    value: str = Field(
        ...,
        description="The numerical value to compare against, as a string. Must contain only digits.",
    )
    operator: Literal[">", "<", ">=", "<=", "=="] = Field(
        ...,
        description="The comparison operator to use.",
    )
    path: str = Field(
        ...,
        description="The path to the field to compare against this criterion. To reference deeply nested fields, use dot notation (e.g., 'order.price').",
    )

    @field_validator("value")
    def validate_value(cls, v: str) -> str:
        """Validate that value contains only digits."""
        if not v.isdigit():
            raise UserInputValidationError("value must contain only digits")
        return v


class EvmTypedStringCondition(BaseModel):
    """Type representing an EVM typed string condition."""

    match: str = Field(
        ...,
        description="A regular expression the string field is matched against. Accepts valid regular expression syntax described by [RE2](https://github.com/google/re2/wiki/Syntax).",
    )
    path: str = Field(
        ...,
        description="The path to the field to compare against this criterion. To reference deeply nested fields, use dot notation (e.g., 'metadata.description').",
    )


class SignEvmTypedDataTypes(BaseModel):
    """The EIP-712 type definitions for the typed data."""

    types: dict[str, list[dict[str, str]]] = Field(
        ...,
        description="EIP-712 compliant map of model names to model definitions.",
    )
    primaryType: str = Field(
        ...,
        description="The name of the root EIP-712 type. This value must be included in the `types` object.",
    )


class SignEvmTypedDataFieldCriterion(BaseModel):
    """Type representing a 'evmTypedDataField' criterion for SignEvmTypedData rule."""

    type: Literal["evmTypedDataField"] = Field(
        "evmTypedDataField",
        description="The type of criterion, must be 'evmTypedDataField' for typed data field-based rules.",
    )
    types: SignEvmTypedDataTypes = Field(
        ...,
        description="The EIP-712 type definitions for the typed data. Must include at minimum the primary type being signed.",
    )
    conditions: list[
        EvmTypedAddressCondition | EvmTypedNumericalCondition | EvmTypedStringCondition
    ] = Field(
        ...,
        description="Array of conditions to apply against typed data fields. Each condition specifies how to validate a specific field within the typed data.",
    )


class SignEvmTypedDataVerifyingContractCriterion(BaseModel):
    """Type representing a 'evmTypedDataVerifyingContract' criterion for SignEvmTypedData rule."""

    type: Literal["evmTypedDataVerifyingContract"] = Field(
        "evmTypedDataVerifyingContract",
        description="The type of criterion, must be 'evmTypedDataVerifyingContract' for verifying contract-based rules.",
    )
    addresses: list[str] = Field(
        ...,
        description="Array of EVM addresses allowed or disallowed as verifying contracts. Each address must be a 0x-prefixed 40-character hexadecimal string. Limited to a maximum of 100 addresses per criterion.",
    )
    operator: Literal["in", "not in"] = Field(
        ...,
        description="The operator to use for evaluating verifying contract addresses. 'in' checks if the verifying contract is in the provided list. 'not in' checks if the verifying contract is not in the provided list.",
    )

    @field_validator("addresses")
    def validate_addresses_length(cls, v):
        """Validate the number of addresses."""
        if len(v) > 300:
            raise UserInputValidationError("Maximum of 300 addresses allowed")
        return v

    @field_validator("addresses")
    def validate_addresses_format(cls, v):
        """Validate each address has 0x prefix and is correct length and format."""
        for addr in v:
            if not re.match(r"^0x[0-9a-fA-F]{40}$", addr):
                raise UserInputValidationError(
                    r"must validate the regular expression /^0x[0-9a-fA-F]{40}$/"
                )
        return v


class SignEvmTypedDataRule(BaseModel):
    """Type representing a 'signEvmTypedData' policy rule that can accept or reject specific operations based on a set of criteria."""

    action: Action = Field(
        ...,
        description="Determines whether matching the rule will cause a request to be rejected or accepted. 'accept' will allow the signing, 'reject' will block it.",
    )
    operation: Literal["signEvmTypedData"] = Field(
        "signEvmTypedData",
        description="The operation to which this rule applies. Must be 'signEvmTypedData'.",
    )
    criteria: list[SignEvmTypedDataFieldCriterion | SignEvmTypedDataVerifyingContractCriterion] = (
        Field(
            ...,
            description="The set of criteria that must be matched for this rule to apply. Must be compatible with the specified operation type.",
        )
    )


class SignEvmTransactionRule(BaseModel):
    """Type representing a 'signEvmTransaction' policy rule that can accept or reject specific operations based on a set of criteria."""

    action: Action = Field(
        ...,
        description="Determines whether matching the rule will cause a request to be rejected or accepted. 'accept' will allow the transaction, 'reject' will block it.",
    )
    operation: Literal["signEvmTransaction"] = Field(
        "signEvmTransaction",
        description="The operation to which this rule applies. Must be 'signEvmTransaction'.",
    )
    criteria: list[
        EthValueCriterion | EvmAddressCriterion | EvmDataCriterion | NetUSDChangeCriterion
    ] = Field(
        ...,
        description="The set of criteria that must be matched for this rule to apply. Must be compatible with the specified operation type.",
    )


class SolAddressCriterion(BaseModel):
    """Type for Solana address criterions."""

    type: Literal["solAddress"] = Field(
        "solAddress",
        description="The type of criterion, must be 'solAddress' for Solana address-based rules.",
    )
    addresses: list[str] = Field(
        ...,
        description="The list of Solana addresses to compare against. Each address must be a valid Base58-encoded Solana address (32-44 characters).",
    )
    operator: Literal["in", "not in"] = Field(
        ...,
        description="The operator to use for evaluating transaction addresses. 'in' checks if an address is in the provided list. 'not in' checks if an address is not in the provided list.",
    )

    @field_validator("addresses")
    def validate_address_format(cls, v):
        """Validate the address format."""
        sol_address_regex = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
        for address in v:
            if not sol_address_regex.match(address):
                raise UserInputValidationError(f"Invalid address format: {address}")
        return v


class SolValueCriterion(BaseModel):
    """Type representing a 'solValue' criterion for SOL value-based rules."""

    type: Literal["solValue"] = Field(
        "solValue",
        description="The type of criterion, must be 'solValue' for SOL value-based rules.",
    )
    solValue: str = Field(
        ...,
        description="The SOL value amount in lamports to compare against, as a string. Must contain only digits.",
    )
    operator: Literal[">", ">=", "<", "<=", "=="] = Field(
        ...,
        description="The comparison operator to use for evaluating transaction SOL values against the threshold.",
    )

    @field_validator("solValue")
    def validate_sol_value(cls, v: str) -> str:
        """Validate that solValue contains only digits."""
        if not v.isdigit():
            raise UserInputValidationError("solValue must contain only digits")
        return v


class SplAddressCriterion(BaseModel):
    """Type representing a 'splAddress' criterion for SPL address-based rules."""

    type: Literal["splAddress"] = Field(
        "splAddress",
        description="The type of criterion, must be 'splAddress' for SPL address-based rules.",
    )
    addresses: list[str] = Field(
        ...,
        description="Array of Solana addresses to compare against for SPL token transfer recipients. Each address must be a valid Base58-encoded Solana address (32-44 characters).",
    )
    operator: Literal["in", "not in"] = Field(
        ...,
        description="The operator to use for evaluating SPL token transfer recipient addresses. 'in' checks if an address is in the provided list. 'not in' checks if an address is not in the provided list.",
    )

    @field_validator("addresses")
    def validate_address_format(cls, v):
        """Validate the address format."""
        sol_address_regex = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
        for address in v:
            if not sol_address_regex.match(address):
                raise UserInputValidationError(f"Invalid address format: {address}")
        return v


class SplValueCriterion(BaseModel):
    """Type representing a 'splValue' criterion for SPL token value-based rules."""

    type: Literal["splValue"] = Field(
        "splValue",
        description="The type of criterion, must be 'splValue' for SPL token value-based rules.",
    )
    splValue: str = Field(
        ...,
        description="The SPL token value amount to compare against, as a string. Must contain only digits.",
    )
    operator: Literal[">", ">=", "<", "<=", "=="] = Field(
        ...,
        description="The comparison operator to use for evaluating SPL token values against the threshold.",
    )

    @field_validator("splValue")
    def validate_spl_value(cls, v: str) -> str:
        """Validate that splValue contains only digits."""
        if not v.isdigit():
            raise UserInputValidationError("splValue must contain only digits")
        return v


class MintAddressCriterion(BaseModel):
    """Type representing a 'mintAddress' criterion for token mint address-based rules."""

    type: Literal["mintAddress"] = Field(
        "mintAddress",
        description="The type of criterion, must be 'mintAddress' for token mint address-based rules.",
    )
    addresses: list[str] = Field(
        ...,
        description="Array of Solana addresses to compare against for token mint addresses. Each address must be a valid Base58-encoded Solana address (32-44 characters).",
    )
    operator: Literal["in", "not in"] = Field(
        ...,
        description="The operator to use for evaluating token mint addresses. 'in' checks if an address is in the provided list. 'not in' checks if an address is not in the provided list.",
    )

    @field_validator("addresses")
    def validate_address_format(cls, v):
        """Validate the address format."""
        sol_address_regex = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
        for address in v:
            if not sol_address_regex.match(address):
                raise UserInputValidationError(f"Invalid address format: {address}")
        return v


class SignSolanaTransactionRule(BaseModel):
    """Type representing a 'signSolTransaction' policy rule that can accept or reject specific operations based on a set of criteria."""

    action: Action = Field(
        ...,
        description="Determines whether matching the rule will cause a request to be rejected or accepted. 'accept' will allow the transaction, 'reject' will block it.",
    )
    operation: Literal["signSolTransaction"] = Field(
        "signSolTransaction",
        description="The operation to which this rule applies. Must be 'signSolTransaction'.",
    )
    criteria: list[
        SolAddressCriterion
        | SolValueCriterion
        | SplAddressCriterion
        | SplValueCriterion
        | MintAddressCriterion
    ] = Field(
        ...,
        description="The set of criteria that must be matched for this rule to apply. Must be compatible with the specified operation type.",
    )


class SendSolanaTransactionRule(BaseModel):
    """Type representing a 'sendSolTransaction' policy rule that can accept or reject specific operations based on a set of criteria."""

    action: Action = Field(
        ...,
        description="Determines whether matching the rule will cause a request to be rejected or accepted. 'accept' will allow the transaction, 'reject' will block it.",
    )
    operation: Literal["sendSolTransaction"] = Field(
        "sendSolTransaction",
        description="The operation to which this rule applies. Must be 'sendSolTransaction'.",
    )
    criteria: list[
        SolAddressCriterion
        | SolValueCriterion
        | SplAddressCriterion
        | SplValueCriterion
        | MintAddressCriterion
    ] = Field(
        ...,
        description="The set of criteria that must be matched for this rule to apply. Must be compatible with the specified operation type.",
    )


"""Type representing the scope of a policy.
Determines whether the policy applies at the project level or account level."""
PolicyScope = Literal["project", "account"]


"""Type representing a policy rule that can accept or reject specific operations based on a set of criteria."""
Rule = (
    SendEvmTransactionRule
    | SignEvmTransactionRule
    | SignEvmHashRule
    | SignEvmMessageRule
    | SignEvmTypedDataRule
    | SignSolanaTransactionRule
    | SendSolanaTransactionRule
)


class Policy(BaseModel):
    """A single Policy that can be used to govern the behavior of projects and accounts."""

    id: str = Field(..., description="The unique identifier for the policy.")
    description: str | None = Field(
        None, description="An optional human-readable description of the policy."
    )
    scope: PolicyScope = Field(
        ...,
        description="The scope of the policy. Only one project-level policy can exist at any time.",
    )
    rules: list[Rule] = Field(..., description="A list of rules that comprise the policy.")
    created_at: str = Field(
        ..., description="The ISO 8601 timestamp at which the Policy was created."
    )
    updated_at: str = Field(
        ..., description="The ISO 8601 timestamp at which the Policy was last updated."
    )


class ListPoliciesResult(BaseModel):
    """The result of listing policies."""

    policies: list[Policy] = Field(description="The policies.")
    next_page_token: str | None = Field(
        None,
        description="The next page token to paginate through the policies. "
        "If None, there are no more policies to paginate through.",
    )


class CreatePolicyOptions(BaseModel):
    """The options to create a policy."""

    scope: PolicyScope = Field(
        ...,
        description="The scope of the policy. Only one project-level policy can exist at any time.",
    )
    description: str | None = Field(
        None,
        description="An optional human-readable description of the policy.",
    )
    rules: list[Rule] = Field(
        ...,
        description="A list of rules that comprise the policy.",
    )


class UpdatePolicyOptions(BaseModel):
    """The options to update a policy."""

    description: str | None = Field(
        None,
        description="An optional human-readable description of the policy.",
    )
    rules: list[Rule] = Field(
        ...,
        description="A list of rules that comprise the policy.",
    )
