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


def map_policy_rules_to_openapi_format(initial_rules: list[Rule]) -> list[Rule]:
    """Build a properly formatted list of OpenAPI policy rules from a list of initial rules.

    Args:
        initial_rules (List[Rule]): The initial rules to build from.

    Returns:
        List[Rule]: A list of rules.

    """
    rules = []
    for rule in initial_rules:
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
