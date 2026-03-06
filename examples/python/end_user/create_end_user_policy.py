# Usage: uv run python end_user/create_end_user_policy.py

import asyncio

from cdp import CdpClient
from cdp.policies.types import (
    CreatePolicyOptions,
    EthValueCriterion,
    EvmAddressCriterion,
    EvmMessageCriterion,
    EvmNetworkCriterion,
    NetUSDChangeCriterion,
    SendEndUserEvmTransactionRule,
    SendEndUserSolTransactionRule,
    SignEndUserEvmMessageRule,
    SignEndUserEvmTransactionRule,
    SignEndUserEvmTypedDataRule,
    SignEndUserSolMessageRule,
    SignEndUserSolTransactionRule,
    SignEvmTypedDataVerifyingContractCriterion,
    SolAddressCriterion,
    SolMessageCriterion,
    SolNetworkCriterion,
    SolValueCriterion,
    SplAddressCriterion,
)
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        policy_options = CreatePolicyOptions(
            description="End User Policy Example",
            scope="project",
            rules=[
                # Restrict end-user EVM transaction signing to a max value and allowlisted recipients
                SignEndUserEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",  # 1 ETH in wei
                            operator="<=",
                        ),
                        EvmAddressCriterion(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                ),
                # Restrict end-user EVM transaction sending to a specific network and max USD exposure
                SendEndUserEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EvmNetworkCriterion(
                            networks=["base", "base-sepolia"],
                            operator="in",
                        ),
                        NetUSDChangeCriterion(
                            changeCents=10000,  # $100.00
                            operator="<=",
                        ),
                    ],
                ),
                # Restrict end-user EVM message signing to messages matching a specific pattern
                SignEndUserEvmMessageRule(
                    action="accept",
                    criteria=[
                        EvmMessageCriterion(
                            match="^Sign in to MyApp.*",
                        ),
                    ],
                ),
                # Restrict end-user EVM typed data signing to a known verifying contract
                SignEndUserEvmTypedDataRule(
                    action="accept",
                    criteria=[
                        SignEvmTypedDataVerifyingContractCriterion(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                ),
                # Restrict end-user Solana transaction signing to allowlisted recipients under a SOL value threshold
                SignEndUserSolTransactionRule(
                    action="accept",
                    criteria=[
                        SolAddressCriterion(
                            addresses=["11111111111111111111111111111111"],
                            operator="in",
                        ),
                        SolValueCriterion(
                            solValue="1000000000",  # 1 SOL in lamports
                            operator="<=",
                        ),
                    ],
                ),
                # Restrict end-user Solana transaction sending to devnet with an SPL token allowlist
                SendEndUserSolTransactionRule(
                    action="accept",
                    criteria=[
                        SolNetworkCriterion(
                            networks=["solana-devnet"],
                            operator="in",
                        ),
                        SplAddressCriterion(
                            addresses=["11111111111111111111111111111111"],
                            operator="in",
                        ),
                    ],
                ),
                # Restrict end-user Solana message signing to messages matching a specific pattern
                SignEndUserSolMessageRule(
                    action="accept",
                    criteria=[
                        SolMessageCriterion(
                            match="^Sign in to MyApp.*",
                        ),
                    ],
                ),
            ],
        )

        policy = await cdp.policies.create_policy(policy=policy_options)

        print("Created end user policy:", policy.id)


asyncio.run(main())
