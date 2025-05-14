from typing import Any

from cdp.api_clients import ApiClients
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest
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
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest
from cdp.policies.types import ListPoliciesResult, Policy, PolicyScope


class PoliciesClient:
    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def create_policy(
        self,
        policy: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> Policy:
        policy = {
            "scope": policy["scope"],
            "description": policy["description"],
            "rules": self._create_rules_from_policy(policy),
        }
        return await self.api_clients.policies.create_policy(
            create_policy_request=CreatePolicyRequest(**policy),
            x_idempotency_key=idempotency_key,
        )

    async def update_policy(
        self,
        id: str,
        policy: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> Policy:
        policy = {
            "description": policy["description"],
            "rules": self._create_rules_from_policy(policy),
        }
        return await self.api_clients.policies.update_policy(
            policy_id=id,
            update_policy_request=UpdatePolicyRequest(**policy),
            x_idempotency_key=idempotency_key,
        )

    async def delete_policy(
        self,
        id: str,
        idempotency_key: str | None = None,
    ) -> None:
        await self.api_clients.policies.delete_policy(
            policy_id=id,
            x_idempotency_key=idempotency_key,
        )

    async def get_policy_by_id(self, id: str) -> Policy:
        return await self.api_clients.policies.get_policy_by_id(
            policy_id=id,
        )

    async def list_policies(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
        scope: PolicyScope | None = None,
    ) -> ListPoliciesResult:
        return await self.api_clients.policies.list_policies(
            page_size=page_size,
            page_token=page_token,
            scope=scope,
        )

    def _create_rules_from_policy(self, policy: dict[str, Any]) -> list[Rule]:
        rules = []
        for rule in policy["rules"]:
            if rule["operation"] == "sendEvmTransaction":
                criteria = []
                for criterion in rule["criteria"]:
                    if criterion["type"] == "ethValue":
                        criteria.append(
                            SendEvmTransactionCriteriaInner(
                                actual_instance=EthValueCriterion(
                                    eth_value=criterion["ethValue"],
                                    operator=criterion["operator"],
                                    type="ethValue",
                                )
                            )
                        )
                    elif criterion["type"] == "evmAddress":
                        criteria.append(
                            SendEvmTransactionCriteriaInner(
                                actual_instance=EvmAddressCriterion(
                                    addresses=criterion["addresses"],
                                    operator=criterion["operator"],
                                    type="evmAddress",
                                )
                            )
                        )
                    elif criterion["type"] == "evmNetwork":
                        criteria.append(
                            SendEvmTransactionCriteriaInner(
                                actual_instance=EvmNetworkCriterion(
                                    networks=criterion["networks"],
                                    operator=criterion["operator"],
                                    type="evmNetwork",
                                )
                            )
                        )
                    else:
                        raise ValueError(
                            f"Unknown criterion type {criterion['type']} for operation {rule['operation']}"
                        )

                rules.append(
                    Rule(
                        actual_instance=SendEvmTransactionRule(
                            action=rule["action"],
                            operation="sendEvmTransaction",
                            criteria=criteria,
                        )
                    )
                )
            elif rule["operation"] == "signEvmTransaction":
                criteria = []
                for criterion in rule["criteria"]:
                    if criterion["type"] == "ethValue":
                        criteria.append(
                            SignEvmTransactionCriteriaInner(
                                actual_instance=EthValueCriterion(
                                    eth_value=criterion["ethValue"],
                                    operator=criterion["operator"],
                                    type="ethValue",
                                )
                            )
                        )
                    elif criterion["type"] == "evmAddress":
                        criteria.append(
                            SignEvmTransactionCriteriaInner(
                                actual_instance=EvmAddressCriterion(
                                    addresses=criterion["addresses"],
                                    operator=criterion["operator"],
                                    type="evmAddress",
                                )
                            )
                        )
                    else:
                        raise ValueError(
                            f"Unknown criterion type {criterion['type']} for operation {rule['operation']}"
                        )

                rules.append(
                    Rule(
                        actual_instance=SignEvmTransactionRule(
                            action=rule["action"],
                            operation="signEvmTransaction",
                            criteria=criteria,
                        )
                    )
                )
            elif rule["operation"] == "signSolTransaction":
                criteria = []
                for criterion in rule["criteria"]:
                    if criterion["type"] == "solAddress":
                        criteria.append(
                            SignSolTransactionCriteriaInner(
                                actual_instance=SolAddressCriterion(
                                    addresses=criterion["addresses"],
                                    operator=criterion["operator"],
                                    type="solAddress",
                                )
                            )
                        )
                    else:
                        raise ValueError(
                            f"Unknown criterion type {criterion['type']} for operation {rule['operation']}"
                        )

                rules.append(
                    Rule(
                        actual_instance=SignSolTransactionRule(
                            action=rule["action"],
                            operation="signSolTransaction",
                            criteria=criteria,
                        )
                    )
                )
            else:
                raise ValueError(f"Unknown operation {rule['operation']}")

        return rules
