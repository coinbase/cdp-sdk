import pytest

from cdp.policies.types import Policy as PolicyModel


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
                {
                    "action": "accept",
                    "operation": "signEvmTransaction",
                    "criteria": [
                        {
                            "type": "evmAddress",
                            "addresses": ["0x000000000000000000000000000000000000dEaD"],
                            "operator": "in",
                        }
                    ],
                }
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
