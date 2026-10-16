# Usage: uv run python evm/policies/simulate_policies.py

import asyncio

from dotenv import load_dotenv
from eth_account.typed_transactions import DynamicFeeTransaction

from cdp import CdpClient
from cdp.openapi_client.models.sign_evm_transaction_simulation_input import (
    SignEvmTransactionSimulationInput,
)
from cdp.utils import serialize_unsigned_transaction

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="PolicySimulationExample")
        transaction = serialize_unsigned_transaction(
            DynamicFeeTransaction.from_dict(
                {
                    "type": 2,
                    "chainId": 84532,
                    "nonce": 0,
                    "to": "0x1234567890123456789012345678901234567890",
                    "value": 1000000000000000,
                    "gas": 21000,
                    "maxFeePerGas": 1000000000,
                    "maxPriorityFeePerGas": 1000000,
                    "data": "0x",
                }
            )
        )
        result = await cdp.policies.simulate(
            SignEvmTransactionSimulationInput(
                operation="signEvmTransaction",
                address=account.address,
                transaction=transaction,
            )
        )

        print("Action:", result.action)
        print("Reason:", result.reason)
        if result.matched_rule:
            print(
                "Matched rule:",
                result.matched_rule.policy.id,
                "rule_index:",
                result.matched_rule.rule_index,
            )
        else:
            print("Matched rule: None")
        for rule in result.unmatched_rules:
            print(
                "Unmatched rule:",
                rule.policy.id,
                "rule_index:",
                rule.rule_index,
                "criterion_index:",
                rule.criterion_index,
                "criterion:",
                rule.criterion.to_dict(),
                "observed:",
                rule.observed.to_dict() if rule.observed else None,
            )


asyncio.run(main())
