import pytest

from cdp.openapi_client.models.evm_address_criterion import EvmAddressCriterion
from cdp.openapi_client.models.policy import Policy as OpenApiPolicyModel
from cdp.openapi_client.models.rule import Rule
from cdp.openapi_client.models.sign_evm_transaction_criteria_inner import (
    SignEvmTransactionCriteriaInner,
)
from cdp.openapi_client.models.sign_evm_transaction_rule import SignEvmTransactionRule
from cdp.policies.types import (
    EvmAddressCriterion as EvmAddressCriterionModel,
    Policy as PolicyModel,
    SignEvmTransactionRule as SignEvmTransactionRuleModel,
)


@pytest.fixture
def openapi_policy_model_factory():
    """Create and return a factory for OpenApi Policy fixtures."""

    def _create_openapi_policy_model(
        id="12345678-abcd-9012-efab-345678901234",
        scope="account",
        description="Account Allowlist Example",
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        rules=None,  # python does not like mutable default arguments
    ):
        if rules is None:
            rules = [
                Rule(
                    actual_instance=SignEvmTransactionRule(
                        action="accept",
                        operation="signEvmTransaction",
                        criteria=[
                            SignEvmTransactionCriteriaInner(
                                actual_instance=EvmAddressCriterion(
                                    type="evmAddress",
                                    addresses=["0x000000000000000000000000000000000000dEaD"],
                                    operator="in",
                                ),
                            ),
                        ],
                    ),
                )
            ]
        return OpenApiPolicyModel(
            id=id,
            scope=scope,
            description=description,
            rules=rules,
            created_at=created_at,
            updated_at=updated_at,
        )

    return _create_openapi_policy_model


@pytest.fixture
def policy_model_factory():
    """Create and return a factory for Policy fixtures."""

    def _create_policy_model(
        id="12345678-abcd-9012-efab-345678901234",
        scope="account",
        description="Account Allowlist Example",
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        rules=None,  # python does not like mutable default arguments
    ):
        if rules is None:
            rules = [
                SignEvmTransactionRuleModel(
                    action="accept",
                    criteria=[
                        EvmAddressCriterionModel(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                ),
            ]
        return PolicyModel(
            id=id,
            scope=scope,
            description=description,
            rules=rules,
            created_at=created_at,
            updated_at=updated_at,
        )

    return _create_policy_model
