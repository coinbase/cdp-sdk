# flake8: noqa: N815
# Ignoring mixed case because underlying library type uses camelCase
# flake8: noqa: N805
# Ignoring first argument of field_validator named cls

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

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
    def eth_value_validate_regular_expression(cls, value):
        """Validate the regular expression."""
        if not re.match(r"^[0-9]+$", value):
            raise ValueError("ethValue must contain only digits")
        return value


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
        if len(v) > 100:
            raise ValueError("Maximum of 100 addresses allowed")
        return v

    @field_validator("addresses")
    def validate_addresses_format(cls, v):
        """Validate each address has 0x prefix and is correct length and format."""
        for addr in v:
            if not re.match(r"^0x[0-9a-fA-F]{40}$", addr):
                raise ValueError(r"must validate the regular expression /^0x[0-9a-fA-F]{40}$/")
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
    criteria: list[EthValueCriterion | EvmAddressCriterion | EvmNetworkCriterion] = Field(
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
        if len(v) > 100:
            raise ValueError("Maximum of 100 addresses allowed")
        return v

    @field_validator("addresses")
    def validate_addresses_format(cls, v):
        """Validate each address has 0x prefix and is correct length and format."""
        for addr in v:
            if not re.match(r"^0x[0-9a-fA-F]{40}$", addr):
                raise ValueError(r"must validate the regular expression /^0x[0-9a-fA-F]{40}$/")
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
    def value_validate_regular_expression(cls, value):
        """Validate the regular expression."""
        if not re.match(r"^[0-9]+$", value):
            raise ValueError("value must contain only digits")
        return value


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
        if len(v) > 100:
            raise ValueError("Maximum of 100 addresses allowed")
        return v

    @field_validator("addresses")
    def validate_addresses_format(cls, v):
        """Validate each address has 0x prefix and is correct length and format."""
        for addr in v:
            if not re.match(r"^0x[0-9a-fA-F]{40}$", addr):
                raise ValueError(r"must validate the regular expression /^0x[0-9a-fA-F]{40}$/")
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
    criteria: list[EthValueCriterion | EvmAddressCriterion] = Field(
        ...,
        description="The set of criteria that must be matched for this rule to apply. Must be compatible with the specified operation type.",
    )


class SolanaAddressCriterion(BaseModel):
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
                raise ValueError(f"Invalid address format: {address}")
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
    criteria: list[SolanaAddressCriterion] = Field(
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
