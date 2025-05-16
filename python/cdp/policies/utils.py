from cdp.openapi_client.models.eth_value_criterion import EthValueCriterion
from cdp.openapi_client.models.evm_address_criterion import EvmAddressCriterion
from cdp.openapi_client.models.evm_network_criterion import EvmNetworkCriterion
from cdp.openapi_client.models.rule import Rule
from cdp.openapi_client.models.send_evm_transaction_criteria_inner import (
    SendEvmTransactionCriteriaInner,
)
from cdp.openapi_client.models.send_evm_transaction_rule import SendEvmTransactionRule
from cdp.openapi_client.models.sign_evm_transaction_criteria_inner import (
    SignEvmTransactionCriteriaInner,
)
from cdp.openapi_client.models.sign_evm_transaction_rule import SignEvmTransactionRule
from cdp.openapi_client.models.sign_sol_transaction_criteria_inner import (
    SignSolTransactionCriteriaInner,
)
from cdp.openapi_client.models.sign_sol_transaction_rule import SignSolTransactionRule
from cdp.openapi_client.models.sol_address_criterion import SolAddressCriterion
from cdp.policies.types import (
    EthValueCriterion as EthValueCriterionModel,
    EvmAddressCriterion as EvmAddressCriterionModel,
    EvmNetworkCriterion as EvmNetworkCriterionModel,
    Rule as RuleType,
    SendEvmTransactionRule as SendEvmTransactionRuleModel,
    SignEvmTransactionRule as SignEvmTransactionRuleModel,
    SignSolanaTransactionRule as SignSolanaTransactionRuleModel,
    SolanaAddressCriterion as SolanaAddressCriterionModel,
)


def map_request_rules_to_openapi_format(request_rules: list[RuleType]) -> list[Rule]:
    """Build a properly formatted list of OpenAPI policy rules from a list of request rules.

    Args:
        request_rules (List[RuleType]): The request rules to build from.

    Returns:
        List[Rule]: A list of rules formatted for the OpenAPI policy.

    """
    rules = []
    for rule in request_rules:
        if rule.operation == "sendEvmTransaction":
            criteria = []
            for criterion in rule.criteria:
                if criterion.type == "ethValue":
                    criteria.append(
                        SendEvmTransactionCriteriaInner(
                            actual_instance=EthValueCriterion(
                                eth_value=criterion.ethValue,
                                operator=criterion.operator,
                                type="ethValue",
                            )
                        )
                    )
                elif criterion.type == "evmAddress":
                    criteria.append(
                        SendEvmTransactionCriteriaInner(
                            actual_instance=EvmAddressCriterion(
                                addresses=criterion.addresses,
                                operator=criterion.operator,
                                type="evmAddress",
                            )
                        )
                    )
                elif criterion.type == "evmNetwork":
                    criteria.append(
                        SendEvmTransactionCriteriaInner(
                            actual_instance=EvmNetworkCriterion(
                                networks=criterion.networks,
                                operator=criterion.operator,
                                type="evmNetwork",
                            )
                        )
                    )
                else:
                    raise ValueError(
                        f"Unknown criterion type {criterion.type} for operation {rule.operation}"
                    )

            rules.append(
                Rule(
                    actual_instance=SendEvmTransactionRule(
                        action=rule.action,
                        operation="sendEvmTransaction",
                        criteria=criteria,
                    )
                )
            )
        elif rule.operation == "signEvmTransaction":
            criteria = []
            for criterion in rule.criteria:
                if criterion.type == "ethValue":
                    criteria.append(
                        SignEvmTransactionCriteriaInner(
                            actual_instance=EthValueCriterion(
                                eth_value=criterion.ethValue,
                                operator=criterion.operator,
                                type="ethValue",
                            )
                        )
                    )
                elif criterion.type == "evmAddress":
                    criteria.append(
                        SignEvmTransactionCriteriaInner(
                            actual_instance=EvmAddressCriterion(
                                addresses=criterion.addresses,
                                operator=criterion.operator,
                                type="evmAddress",
                            )
                        )
                    )
                else:
                    raise ValueError(
                        f"Unknown criterion type {criterion.type} for operation {rule.operation}"
                    )

            rules.append(
                Rule(
                    actual_instance=SignEvmTransactionRule(
                        action=rule.action,
                        operation="signEvmTransaction",
                        criteria=criteria,
                    )
                )
            )
        elif rule.operation == "signSolTransaction":
            criteria = []
            for criterion in rule.criteria:
                if criterion.type == "solAddress":
                    criteria.append(
                        SignSolTransactionCriteriaInner(
                            actual_instance=SolAddressCriterion(
                                addresses=criterion.addresses,
                                operator=criterion.operator,
                                type="solAddress",
                            )
                        )
                    )
                else:
                    raise ValueError(
                        f"Unknown criterion type {criterion.type} for operation {rule.operation}"
                    )

            rules.append(
                Rule(
                    actual_instance=SignSolTransactionRule(
                        action=rule.action,
                        operation="signSolTransaction",
                        criteria=criteria,
                    )
                )
            )
        else:
            raise ValueError(f"Unknown operation {rule.operation}")

    return rules


def map_openapi_rules_to_response_format(openapi_rules: list[Rule]) -> list[RuleType]:
    """Build a properly formatted list of response rules from a list of OpenAPI policy rules.

    Args:
        openapi_rules (List[Rule]): The OpenAPI policy rules to build from.

    Returns:
        List[RuleType]: A list of rules formatted for the response.

    """
    rules = []
    for rule in openapi_rules:
        if rule.actual_instance.operation == "sendEvmTransaction":
            criteria = []
            for criterion in rule.actual_instance.criteria:
                if criterion.actual_instance.type == "ethValue":
                    criteria.append(
                        EthValueCriterionModel(
                            ethValue=criterion.actual_instance.eth_value,
                            operator=criterion.actual_instance.operator,
                        )
                    )
                elif criterion.actual_instance.type == "evmAddress":
                    criteria.append(
                        EvmAddressCriterionModel(
                            addresses=criterion.actual_instance.addresses,
                            operator=criterion.actual_instance.operator,
                        )
                    )
                elif criterion.actual_instance.type == "evmNetwork":
                    criteria.append(
                        EvmNetworkCriterionModel(
                            networks=criterion.actual_instance.networks,
                            operator=criterion.actual_instance.operator,
                        )
                    )
                else:
                    raise ValueError(f"Unknown criterion type {criterion.actual_instance.type}")

            rules.append(
                SendEvmTransactionRuleModel(
                    action=rule.actual_instance.action,
                    criteria=criteria,
                )
            )
        elif rule.actual_instance.operation == "signEvmTransaction":
            criteria = []
            for criterion in rule.actual_instance.criteria:
                if criterion.actual_instance.type == "ethValue":
                    criteria.append(
                        EthValueCriterionModel(
                            ethValue=criterion.actual_instance.eth_value,
                            operator=criterion.actual_instance.operator,
                        )
                    )
                elif criterion.actual_instance.type == "evmAddress":
                    criteria.append(
                        EvmAddressCriterionModel(
                            addresses=criterion.actual_instance.addresses,
                            operator=criterion.actual_instance.operator,
                        )
                    )
                else:
                    raise ValueError(f"Unknown criterion type {criterion.actual_instance.type}")

            rules.append(
                SignEvmTransactionRuleModel(
                    action=rule.actual_instance.action,
                    criteria=criteria,
                )
            )
        elif rule.actual_instance.operation == "signSolTransaction":
            criteria = []
            for criterion in rule.actual_instance.criteria:
                if criterion.actual_instance.type == "solAddress":
                    criteria.append(
                        SolanaAddressCriterionModel(
                            addresses=criterion.actual_instance.addresses,
                            operator=criterion.actual_instance.operator,
                        )
                    )
                else:
                    raise ValueError(f"Unknown criterion type {criterion.actual_instance.type}")

            rules.append(
                SignSolanaTransactionRuleModel(
                    action=rule.actual_instance.action,
                    criteria=criteria,
                )
            )
        else:
            raise ValueError(f"Unknown operation {rule.actual_instance.operation}")

    return rules
