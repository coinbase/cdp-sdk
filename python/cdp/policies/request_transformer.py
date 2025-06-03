from cdp.openapi_client.models.eth_value_criterion import EthValueCriterion
from cdp.openapi_client.models.evm_address_criterion import EvmAddressCriterion
from cdp.openapi_client.models.evm_message_criterion import EvmMessageCriterion
from cdp.openapi_client.models.evm_network_criterion import EvmNetworkCriterion
from cdp.openapi_client.models.rule import Rule
from cdp.openapi_client.models.send_evm_transaction_criteria_inner import (
    SendEvmTransactionCriteriaInner,
)
from cdp.openapi_client.models.send_evm_transaction_rule import SendEvmTransactionRule
from cdp.openapi_client.models.sign_evm_hash_rule import SignEvmHashRule
from cdp.openapi_client.models.sign_evm_message_criteria_inner import SignEvmMessageCriteriaInner
from cdp.openapi_client.models.sign_evm_message_rule import SignEvmMessageRule
from cdp.openapi_client.models.sign_evm_transaction_criteria_inner import (
    SignEvmTransactionCriteriaInner,
)
from cdp.openapi_client.models.sign_evm_transaction_rule import SignEvmTransactionRule
from cdp.openapi_client.models.sign_sol_transaction_criteria_inner import (
    SignSolTransactionCriteriaInner,
)
from cdp.openapi_client.models.sign_sol_transaction_rule import SignSolTransactionRule
from cdp.openapi_client.models.sol_address_criterion import SolAddressCriterion
from cdp.policies.types import Rule as RuleType

# OpenAPI criterion constructor mapping per operation
openapi_criterion_mapping = {
    "sendEvmTransaction": {
        "ethValue": lambda c: SendEvmTransactionCriteriaInner(
            actual_instance=EthValueCriterion(
                eth_value=c.ethValue,
                operator=c.operator,
                type="ethValue",
            )
        ),
        "evmAddress": lambda c: SendEvmTransactionCriteriaInner(
            actual_instance=EvmAddressCriterion(
                addresses=c.addresses,
                operator=c.operator,
                type="evmAddress",
            )
        ),
        "evmNetwork": lambda c: SendEvmTransactionCriteriaInner(
            actual_instance=EvmNetworkCriterion(
                networks=c.networks,
                operator=c.operator,
                type="evmNetwork",
            )
        ),
    },
    "signEvmTransaction": {
        "ethValue": lambda c: SignEvmTransactionCriteriaInner(
            actual_instance=EthValueCriterion(
                eth_value=c.ethValue,
                operator=c.operator,
                type="ethValue",
            )
        ),
        "evmAddress": lambda c: SignEvmTransactionCriteriaInner(
            actual_instance=EvmAddressCriterion(
                addresses=c.addresses,
                operator=c.operator,
                type="evmAddress",
            )
        ),
    },
    "signEvmHash": {},
    "signEvmMessage": {
        "evmMessage": lambda c: SignEvmMessageCriteriaInner(
            actual_instance=EvmMessageCriterion(
                match=c.match,
                type="evmMessage",
            )
        ),
    },
    "signSolTransaction": {
        "solAddress": lambda c: SignSolTransactionCriteriaInner(
            actual_instance=SolAddressCriterion(
                addresses=c.addresses,
                operator=c.operator,
                type="solAddress",
            )
        ),
    },
}

# OpenAPI rule constructor mapping
openapi_rule_mapping = {
    "sendEvmTransaction": SendEvmTransactionRule,
    "signEvmTransaction": SignEvmTransactionRule,
    "signEvmHash": SignEvmHashRule,
    "signEvmMessage": SignEvmMessageRule,
    "signSolTransaction": SignSolTransactionRule,
}


def map_request_rules_to_openapi_format(request_rules: list[RuleType]) -> list[Rule]:
    """Build a properly formatted list of OpenAPI policy rules from a list of request rules.

    Args:
        request_rules (List[RuleType]): The request rules to build from.

    Returns:
        List[Rule]: A list of rules formatted for the OpenAPI policy.

    """
    rules = []
    for rule in request_rules:
        if rule.operation not in openapi_criterion_mapping:
            raise ValueError(f"Unknown operation {rule.operation}")

        rule_cls = openapi_rule_mapping[rule.operation]

        if not hasattr(rule, "criteria"):
            rules.append(
                Rule(
                    actual_instance=rule_cls(
                        action=rule.action,
                        operation=rule.operation,
                    )
                )
            )
            continue

        criteria_builders = openapi_criterion_mapping[rule.operation]
        criteria = []

        for criterion in rule.criteria:
            if criterion.type not in criteria_builders:
                raise ValueError(
                    f"Unknown criterion type {criterion.type} for operation {rule.operation}"
                )
            criteria.append(criteria_builders[criterion.type](criterion))

        rules.append(
            Rule(
                actual_instance=rule_cls(
                    action=rule.action,
                    operation=rule.operation,
                    criteria=criteria,
                )
            )
        )

    return rules
