from cdp.openapi_client.models.rule import Rule
from cdp.policies.types import (
    EthValueCriterion as EthValueCriterionModel,
    EvmAddressCriterion as EvmAddressCriterionModel,
    EvmDataCondition as EvmDataConditionModel,
    EvmDataCriterion as EvmDataCriterionModel,
    EvmDataParameterCondition as EvmDataParameterConditionModel,
    EvmDataParameterConditionList as EvmDataParameterConditionListModel,
    EvmMessageCriterion as EvmMessageCriterionModel,
    EvmNetworkCriterion as EvmNetworkCriterionModel,
    EvmTypedAddressCondition as EvmTypedAddressConditionModel,
    EvmTypedNumericalCondition as EvmTypedNumericalConditionModel,
    EvmTypedStringCondition as EvmTypedStringConditionModel,
    MintAddressCriterion as MintAddressCriterionModel,
    NetUSDChangeCriterion as NetUSDChangeCriterionModel,
    Rule as RuleType,
    SendEvmTransactionRule as SendEvmTransactionRuleModel,
    SendSolanaTransactionRule as SendSolanaTransactionRuleModel,
    SignEvmHashRule as SignEvmHashRuleModel,
    SignEvmMessageRule as SignEvmMessageRuleModel,
    SignEvmTransactionRule as SignEvmTransactionRuleModel,
    SignEvmTypedDataFieldCriterion as SignEvmTypedDataFieldCriterionModel,
    SignEvmTypedDataRule as SignEvmTypedDataRuleModel,
    SignEvmTypedDataTypes as SignEvmTypedDataTypesModel,
    SignEvmTypedDataVerifyingContractCriterion as SignEvmTypedDataVerifyingContractCriterionModel,
    SignSolanaTransactionRule as SignSolanaTransactionRuleModel,
    SolAddressCriterion as SolAddressCriterionModel,
    SolValueCriterion as SolValueCriterionModel,
    SplAddressCriterion as SplAddressCriterionModel,
    SplValueCriterion as SplValueCriterionModel,
)

# Response criterion mapping per operation
response_criterion_mapping = {
    "sendEvmTransaction": {
        "ethValue": lambda c: EthValueCriterionModel(ethValue=c.eth_value, operator=c.operator),
        "evmAddress": lambda c: EvmAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
        "evmNetwork": lambda c: EvmNetworkCriterionModel(networks=c.networks, operator=c.operator),
        "netUSDChange": lambda c: NetUSDChangeCriterionModel(
            changeCents=c.change_cents, operator=c.operator
        ),
        "evmData": lambda c: EvmDataCriterionModel(
            abi=c.abi.actual_instance,
            conditions=[
                EvmDataConditionModel(
                    function=cond.function,
                    params=(
                        [
                            (
                                EvmDataParameterConditionListModel(
                                    name=param.actual_instance.name,
                                    operator=param.actual_instance.operator,
                                    values=param.actual_instance.values,
                                )
                                if hasattr(param.actual_instance, "values")
                                else EvmDataParameterConditionModel(
                                    name=param.actual_instance.name,
                                    operator=param.actual_instance.operator,
                                    value=param.actual_instance.value,
                                )
                            )
                            for param in cond.params
                        ]
                        if cond.params
                        else None
                    ),
                )
                for cond in c.conditions
            ],
        ),
    },
    "signEvmTransaction": {
        "ethValue": lambda c: EthValueCriterionModel(ethValue=c.eth_value, operator=c.operator),
        "evmAddress": lambda c: EvmAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
        "netUSDChange": lambda c: NetUSDChangeCriterionModel(
            changeCents=c.change_cents, operator=c.operator
        ),
        "evmData": lambda c: EvmDataCriterionModel(
            abi=c.abi.actual_instance,
            conditions=[
                EvmDataConditionModel(
                    function=cond.function,
                    params=(
                        [
                            (
                                EvmDataParameterConditionListModel(
                                    name=param.actual_instance.name,
                                    operator=param.actual_instance.operator,
                                    values=param.actual_instance.values,
                                )
                                if hasattr(param.actual_instance, "values")
                                else EvmDataParameterConditionModel(
                                    name=param.actual_instance.name,
                                    operator=param.actual_instance.operator,
                                    value=param.actual_instance.value,
                                )
                            )
                            for param in cond.params
                        ]
                        if cond.params
                        else None
                    ),
                )
                for cond in c.conditions
            ],
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
        "solAddress": lambda c: SolAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
        "solValue": lambda c: SolValueCriterionModel(solValue=c.sol_value, operator=c.operator),
        "splAddress": lambda c: SplAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
        "splValue": lambda c: SplValueCriterionModel(splValue=c.spl_value, operator=c.operator),
        "mintAddress": lambda c: MintAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
    },
    "sendSolTransaction": {
        "solAddress": lambda c: SolAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
        "solValue": lambda c: SolValueCriterionModel(solValue=c.sol_value, operator=c.operator),
        "splAddress": lambda c: SplAddressCriterionModel(
            addresses=c.addresses, operator=c.operator
        ),
        "splValue": lambda c: SplValueCriterionModel(splValue=c.spl_value, operator=c.operator),
        "mintAddress": lambda c: MintAddressCriterionModel(
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
    "sendSolTransaction": SendSolanaTransactionRuleModel,
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
