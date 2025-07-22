from cdp.openapi_client.models.rule import Rule
from cdp.policies.types import (
    EthValueCriterion as EthValueCriterionModel,
    EvmAddressCriterion as EvmAddressCriterionModel,
    EvmMessageCriterion as EvmMessageCriterionModel,
    EvmNetworkCriterion as EvmNetworkCriterionModel,
    EvmTypedAddressCondition as EvmTypedAddressConditionModel,
    EvmTypedNumericalCondition as EvmTypedNumericalConditionModel,
    EvmTypedStringCondition as EvmTypedStringConditionModel,
    Rule as RuleType,
    SendEvmTransactionRule as SendEvmTransactionRuleModel,
    SignEvmHashRule as SignEvmHashRuleModel,
    SignEvmMessageRule as SignEvmMessageRuleModel,
    SignEvmTransactionRule as SignEvmTransactionRuleModel,
    SignEvmTypedDataFieldCriterion as SignEvmTypedDataFieldCriterionModel,
    SignEvmTypedDataRule as SignEvmTypedDataRuleModel,
    SignEvmTypedDataTypes as SignEvmTypedDataTypesModel,
    SignEvmTypedDataVerifyingContractCriterion as SignEvmTypedDataVerifyingContractCriterionModel,
    SignSolanaTransactionRule as SignSolanaTransactionRuleModel,
    SolanaAddressCriterion as SolanaAddressCriterionModel,
)

# Response criterion mapping per operation
response_criterion_mapping = {
    "sendEvmTransaction": {
        "ethValue": lambda c: EthValueCriterionModel(ethValue=c.eth_value, operator=c.operator),
        "evmAddress": lambda c: EvmAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
        "evmNetwork": lambda c: EvmNetworkCriterionModel(networks=c.networks, operator=c.operator),
    },
    "signEvmTransaction": {
        "ethValue": lambda c: EthValueCriterionModel(ethValue=c.eth_value, operator=c.operator),
        "evmAddress": lambda c: EvmAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
    },
    "signEvmHash": {},
    "signEvmMessage": {
        "evmMessage": lambda c: EvmMessageCriterionModel(match=c.match),
    },
    "signEvmTypedData": {
        "evmTypedDataField": lambda c: SignEvmTypedDataFieldCriterionModel(
            types=SignEvmTypedDataTypesModel(
                types={
                    key: [{"name": item.name, "type": item.type} for item in value]
                    for key, value in c.types.types.items()
                },
                primaryType=c.types.primary_type,
            ),
            conditions=[
                (
                    EvmTypedAddressConditionModel(
                        addresses=cond.actual_instance.addresses,
                        operator=cond.actual_instance.operator,
                        path=cond.actual_instance.path,
                    )
                    if hasattr(cond.actual_instance, "addresses")
                    else EvmTypedNumericalConditionModel(
                        value=cond.actual_instance.value,
                        operator=cond.actual_instance.operator,
                        path=cond.actual_instance.path,
                    )
                    if hasattr(cond.actual_instance, "value")
                    else EvmTypedStringConditionModel(
                        match=cond.actual_instance.match,
                        path=cond.actual_instance.path,
                    )
                )
                for cond in c.conditions
            ],
        ),
        "evmTypedDataVerifyingContract": lambda c: SignEvmTypedDataVerifyingContractCriterionModel(
            addresses=c.addresses,
            operator=c.operator,
        ),
    },
    "signSolTransaction": {
        "solAddress": lambda c: SolanaAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
    },
}

# Response rule class mapping
response_rule_mapping = {
    "sendEvmTransaction": SendEvmTransactionRuleModel,
    "signEvmTransaction": SignEvmTransactionRuleModel,
    "signEvmHash": SignEvmHashRuleModel,
    "signEvmMessage": SignEvmMessageRuleModel,
    "signEvmTypedData": SignEvmTypedDataRuleModel,
    "signSolTransaction": SignSolanaTransactionRuleModel,
}


def map_openapi_rules_to_response_format(openapi_rules: list[Rule]) -> list[RuleType]:
    """Build a properly formatted list of response rules from a list of OpenAPI policy rules.

    Args:
        openapi_rules (List[Rule]): The OpenAPI policy rules to build from.

    Returns:
        List[RuleType]: A list of rules formatted for the response.

    """
    response_rules = []

    for rule in openapi_rules:
        instance = rule.actual_instance
        operation = instance.operation

        if operation not in response_criterion_mapping:
            raise ValueError(f"Unknown operation {operation}")

        rule_class = response_rule_mapping[operation]

        if not hasattr(instance, "criteria"):
            response_rules.append(rule_class(action=instance.action))
            continue

        criteria_constructors = response_criterion_mapping[operation]
        criteria = []

        for criterion_wrapper in instance.criteria:
            criterion = criterion_wrapper.actual_instance
            if criterion.type not in criteria_constructors:
                raise ValueError(f"Unknown criterion type {criterion.type}")
            criteria.append(criteria_constructors[criterion.type](criterion))

        response_rules.append(rule_class(action=instance.action, criteria=criteria))

    return response_rules
