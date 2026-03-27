from unittest.mock import AsyncMock

import pytest

from cdp.api_clients import ApiClients
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest
from cdp.openapi_client.models.idl import Idl
from cdp.openapi_client.models.known_idl_type import KnownIdlType
from cdp.openapi_client.models.list_policies200_response import ListPolicies200Response
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest
from cdp.policies.request_transformer import map_request_rules_to_openapi_format
from cdp.policies.response_transformer import map_openapi_rules_to_response_format
from cdp.policies.types import (
    CreatePolicyOptions,
    EthValueCriterion,
    EvmAddressCriterion,
    EvmNetworkCriterion,
    MintAddressCriterion,
    NetUSDChangeCriterion,
    PrepareUserOperationRule,
    ProgramIdCriterion,
    RateLimitingCriterion,
    SendEndUserEvmAssetRule,
    SendEndUserEvmTransactionRule,
    SendEndUserSolAssetRule,
    SendEndUserSolTransactionRule,
    SendEvmTransactionRule,
    SendSolanaTransactionRule,
    SignEndUserEvmMessageRule,
    SignEndUserEvmTransactionRule,
    SignEndUserSolMessageRule,
    SignEndUserSolTransactionRule,
    SignEvmTransactionRule,
    SignSolanaTransactionRule,
    SignSolMessageRule,
    SolAddressCriterion,
    SolDataCondition,
    SolDataCriterion,
    SolDataParameterCondition,
    SolDataParameterConditionList,
    SolMessageCriterion,
    SolNetworkCriterion,
    SolValueCriterion,
    SplAddressCriterion,
    SplValueCriterion,
    UpdatePolicyOptions,
)
from cdp.policies_client import PoliciesClient


def test_init():
    """Test the initialization of the EvmClient."""
    client = PoliciesClient(
        api_clients=ApiClients(
            CdpApiClient(
                api_key_id="test_api_key_id",
                api_key_secret="test_api_key_secret",
                wallet_secret="test_wallet_secret",
            )
        )
    )

    assert client.api_clients._cdp_client.api_key_id == "test_api_key_id"
    assert client.api_clients._cdp_client.api_key_secret == "test_api_key_secret"
    assert client.api_clients._cdp_client.wallet_secret == "test_wallet_secret"
    assert hasattr(client, "api_clients")


@pytest.mark.asyncio
async def test_create_policy(openapi_policy_model_factory, policy_model_factory):
    """Test the creation of a policy."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope=policy_model.scope,
        description=policy_model.description,
        rules=policy_model.rules,
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sign_end_user_evm_transaction_rule(
    openapi_policy_model_factory, policy_model_factory
):
    """Test that a policy can be created with a SignEndUserEvmTransactionRule."""
    openapi_policy_model = openapi_policy_model_factory()

    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser EVM Transaction Policy",
        rules=[
            SignEndUserEvmTransactionRule(
                action="accept",
                operation="signEndUserEvmTransaction",
                criteria=[
                    EvmAddressCriterion(
                        type="evmAddress",
                        addresses=["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_send_end_user_evm_transaction_rule(
    openapi_policy_model_factory, policy_model_factory
):
    """Test that a policy can be created with a SendEndUserEvmTransactionRule."""
    openapi_policy_model = openapi_policy_model_factory()

    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser EVM Send Transaction Policy",
        rules=[
            SendEndUserEvmTransactionRule(
                action="reject",
                operation="sendEndUserEvmTransaction",
                criteria=[
                    EvmAddressCriterion(
                        type="evmAddress",
                        addresses=["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
                        operator="not in",
                    ),
                    NetUSDChangeCriterion(
                        type="netUSDChange",
                        changeCents=10000,
                        operator=">=",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sign_end_user_sol_transaction_rule(
    openapi_policy_model_factory, policy_model_factory
):
    """Test that a policy can be created with a SignEndUserSolTransactionRule."""
    openapi_policy_model = openapi_policy_model_factory()

    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser SOL Transaction Policy",
        rules=[
            SignEndUserSolTransactionRule(
                action="accept",
                operation="signEndUserSolTransaction",
                criteria=[
                    SolAddressCriterion(
                        type="solAddress",
                        addresses=["HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT"],
                        operator="in",
                    ),
                    ProgramIdCriterion(
                        type="programId",
                        programIds=["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sign_end_user_sol_message_rule(
    openapi_policy_model_factory, policy_model_factory
):
    """Test that a policy can be created with a SignEndUserSolMessageRule."""
    openapi_policy_model = openapi_policy_model_factory()

    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser SOL Message Policy",
        rules=[
            SignEndUserSolMessageRule(
                action="reject",
                operation="signEndUserSolMessage",
                criteria=[
                    SolMessageCriterion(
                        type="solMessage",
                        match="^hello ([a-z]+)$",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_multiple_end_user_rules(
    openapi_policy_model_factory, policy_model_factory
):
    """Test that a policy can be created with multiple EndUser rules."""
    openapi_policy_model = openapi_policy_model_factory()

    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Multiple EndUser Rules Policy",
        rules=[
            SignEndUserEvmTransactionRule(
                action="accept",
                operation="signEndUserEvmTransaction",
                criteria=[
                    EvmAddressCriterion(
                        type="evmAddress",
                        addresses=["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
                        operator="in",
                    ),
                ],
            ),
            SendEndUserSolTransactionRule(
                action="reject",
                operation="sendEndUserSolTransaction",
                criteria=[
                    SolAddressCriterion(
                        type="solAddress",
                        addresses=["HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT"],
                        operator="not in",
                    ),
                    SolNetworkCriterion(
                        type="solNetwork",
                        networks=["solana"],
                        operator="in",
                    ),
                ],
            ),
            SignEndUserEvmMessageRule(
                action="accept",
                operation="signEndUserEvmMessage",
                criteria=[],
            ),
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_update_policy(openapi_policy_model_factory, policy_model_factory):
    """Test the update of a policy."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.update_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    update_options = UpdatePolicyOptions(
        description=policy_model.description,
        rules=policy_model.rules,
    )

    result = await client.update_policy(openapi_policy_model.id, update_options)

    mock_policies_api.update_policy.assert_called_once_with(
        policy_id=openapi_policy_model.id,
        update_policy_request=UpdatePolicyRequest(
            description=policy_model.description,
            rules=map_request_rules_to_openapi_format(update_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id == policy_model.id
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_delete_policy():
    """Test the deletion of a policy."""
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.delete_policy = AsyncMock(return_value=None)

    client = PoliciesClient(api_clients=mock_api_clients)

    result = await client.delete_policy("123")

    mock_policies_api.delete_policy.assert_called_once_with(
        policy_id="123",
        x_idempotency_key=None,
    )
    assert result is None


@pytest.mark.asyncio
async def test_get_policy_by_id(openapi_policy_model_factory, policy_model_factory):
    """Test the retrieval of a policy by ID."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.get_policy_by_id = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    result = await client.get_policy_by_id(openapi_policy_model.id)

    mock_policies_api.get_policy_by_id.assert_called_once_with(policy_id=openapi_policy_model.id)
    assert result.id == policy_model.id
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_list_policies(openapi_policy_model_factory, policy_model_factory):
    """Test the listing of policies."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.list_policies = AsyncMock(
        return_value=ListPolicies200Response(
            policies=[openapi_policy_model],
            next_page_token=None,
        )
    )

    policy_model = policy_model_factory()

    client = PoliciesClient(api_clients=mock_api_clients)

    # Test without scope
    result = await client.list_policies()

    mock_policies_api.list_policies.assert_called_with(
        page_size=None,
        page_token=None,
        scope=None,
    )
    assert result.policies == [policy_model]
    assert result.next_page_token is None

    # Test with scope
    result = await client.list_policies(scope="account")

    mock_policies_api.list_policies.assert_called_with(
        page_size=None,
        page_token=None,
        scope="account",
    )
    assert result.policies == [policy_model]
    assert result.next_page_token is None


@pytest.mark.asyncio
async def test_create_policy_with_sol_address_and_value_criteria(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with SOL value criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Limit SOL transactions to 1 SOL and address",
        rules=[
            SignSolanaTransactionRule(
                action="reject",
                operation="signSolTransaction",
                criteria=[
                    SolValueCriterion(
                        type="solValue",
                        solValue="1000000000",
                        operator=">",
                    ),
                    SolAddressCriterion(
                        type="solAddress",
                        addresses=["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_spl_address_value_and_mint_criteria(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with SPL address criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Block SPL tokens, values and mint addresses",
        rules=[
            SendSolanaTransactionRule(
                action="reject",
                operation="sendSolTransaction",
                criteria=[
                    SplAddressCriterion(
                        type="splAddress",
                        addresses=["9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"],
                        operator="in",
                    ),
                    SplValueCriterion(
                        type="splValue",
                        splValue="1000000",
                        operator=">=",
                    ),
                    MintAddressCriterion(
                        type="mintAddress",
                        addresses=["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_netusdchange_criteria(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with netUSDChange criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="netusd change",
        rules=[
            SignEvmTransactionRule(
                action="reject",
                operation="signEvmTransaction",
                criteria=[
                    NetUSDChangeCriterion(
                        type="netUSDChange",
                        changeCents=10000,
                        operator=">",
                    ),
                ],
            ),
            SendEvmTransactionRule(
                action="reject",
                operation="sendEvmTransaction",
                criteria=[
                    NetUSDChangeCriterion(
                        type="netUSDChange",
                        changeCents=10000,
                        operator=">",
                    ),
                ],
            ),
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_evmnetwork_criteria(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with evmNetwork criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="evmnetwork",
        rules=[
            PrepareUserOperationRule(
                action="reject",
                operation="prepareUserOperation",
                criteria=[
                    EvmNetworkCriterion(
                        type="evmNetwork",
                        networks=[
                            "base-sepolia",
                            "base",
                            "arbitrum",
                            "optimism",
                            "zora",
                            "polygon",
                            "bnb",
                            "avalanche",
                            "ethereum",
                            "ethereum-sepolia",
                        ],
                        operator="in",
                    ),
                ],
            ),
            SendEvmTransactionRule(
                action="reject",
                operation="sendEvmTransaction",
                criteria=[
                    EvmNetworkCriterion(
                        type="evmNetwork",
                        networks=[
                            "base",
                            "base-sepolia",
                            "ethereum",
                            "ethereum-sepolia",
                            "avalanche",
                            "polygon",
                            "optimism",
                            "arbitrum",
                        ],
                        operator="in",
                    ),
                ],
            ),
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sol_data_known_idls(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with solData criterion using known IDLs."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Set limits on known Solana program instructions",
        rules=[
            SignSolanaTransactionRule(
                action="accept",
                operation="signSolTransaction",
                criteria=[
                    SolDataCriterion(
                        type="solData",
                        idls=[
                            KnownIdlType.SYSTEMPROGRAM,
                            KnownIdlType.TOKENPROGRAM,
                            KnownIdlType.ASSOCIATEDTOKENPROGRAM,
                        ],
                        conditions=[
                            SolDataCondition(
                                instruction="transfer",
                                params=[
                                    SolDataParameterCondition(
                                        name="lamports",
                                        operator="<=",
                                        value="1000000",
                                    ),
                                ],
                            ),
                            SolDataCondition(
                                instruction="transfer_checked",
                                params=[
                                    SolDataParameterCondition(
                                        name="amount",
                                        operator="<=",
                                        value="100000",
                                    ),
                                    SolDataParameterCondition(
                                        name="decimals",
                                        operator="==",
                                        value="6",
                                    ),
                                ],
                            ),
                            SolDataCondition(
                                instruction="create",
                            ),
                        ],
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sol_data_custom_idls(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with solData criterion using custom IDLs."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Set limits on custom Solana program instructions",
        rules=[
            SignSolanaTransactionRule(
                action="accept",
                operation="signSolTransaction",
                criteria=[
                    SolDataCriterion(
                        type="solData",
                        idls=[
                            Idl(
                                address="11111111111111111111111111111111",
                                instructions=[
                                    {
                                        "name": "transfer",
                                        "discriminator": [163, 52, 200, 231, 140, 3, 69, 186],
                                        "args": [
                                            {
                                                "name": "lamports",
                                                "type": "u64",
                                            },
                                        ],
                                    }
                                ],
                            ),
                            Idl(
                                address="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                                instructions=[
                                    {
                                        "name": "transfer_checked",
                                        "discriminator": [119, 250, 202, 24, 253, 135, 244, 121],
                                        "args": [
                                            {
                                                "name": "amount",
                                                "type": "u64",
                                            },
                                            {
                                                "name": "decimals",
                                                "type": "u8",
                                            },
                                        ],
                                    }
                                ],
                            ),
                        ],
                        conditions=[
                            SolDataCondition(
                                instruction="transfer",
                                params=[
                                    SolDataParameterCondition(
                                        name="lamports",
                                        operator="<=",
                                        value="1000000",
                                    ),
                                ],
                            ),
                            SolDataCondition(
                                instruction="transfer_checked",
                                params=[
                                    SolDataParameterCondition(
                                        name="amount",
                                        operator="<=",
                                        value="100000",
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sol_data_list_parameter_conditions(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with solData criterion using list parameter conditions."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Set limits on token program instruction data",
        rules=[
            SignSolanaTransactionRule(
                action="accept",
                operation="signSolTransaction",
                criteria=[
                    SolDataCriterion(
                        type="solData",
                        idls=[KnownIdlType.TOKENPROGRAM],
                        conditions=[
                            SolDataCondition(
                                instruction="transfer_checked",
                                params=[
                                    SolDataParameterConditionList(
                                        name="decimals",
                                        operator="in",
                                        values=["6", "9"],
                                    ),
                                    SolDataParameterCondition(
                                        name="amount",
                                        operator="<=",
                                        value="1000000",
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sol_data_no_params(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with solData criterion without parameter conditions."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Allow instructions without params",
        rules=[
            SignSolanaTransactionRule(
                action="accept",
                operation="signSolTransaction",
                criteria=[
                    SolDataCriterion(
                        type="solData",
                        idls=[KnownIdlType.ASSOCIATEDTOKENPROGRAM],
                        conditions=[
                            SolDataCondition(
                                instruction="create",
                            ),
                            SolDataCondition(
                                instruction="create_idempotent",
                            ),
                        ],
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sign_sol_transaction_program_id_criterion(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with signSolTransaction programId criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Block transactions with specific program IDs",
        rules=[
            SignSolanaTransactionRule(
                action="reject",
                operation="signSolTransaction",
                criteria=[
                    ProgramIdCriterion(
                        type="programId",
                        programIds=[
                            "11111111111111111111111111111112",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_send_sol_transaction_program_id_criterion(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with sendSolTransaction programId criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Allow only System Program transactions",
        rules=[
            SendSolanaTransactionRule(
                action="accept",
                operation="sendSolTransaction",
                criteria=[
                    ProgramIdCriterion(
                        type="programId",
                        programIds=["11111111111111111111111111111112"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_send_sol_transaction_network_criterion(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with sendSolTransaction solNetwork criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Restrict transactions to devnet only",
        rules=[
            SendSolanaTransactionRule(
                action="accept",
                operation="sendSolTransaction",
                criteria=[
                    SolNetworkCriterion(
                        type="solNetwork",
                        networks=["solana-devnet"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_sign_sol_message_rule(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with signSolMessage rule."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Allow only messages starting with hello",
        rules=[
            SignSolMessageRule(
                action="accept",
                operation="signSolMessage",
                criteria=[
                    SolMessageCriterion(
                        type="solMessage",
                        match="^hello ([a-z]+)$",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


# ---- EndUser rule tests ----


@pytest.mark.asyncio
async def test_create_policy_with_multiple_new_criteria(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with multiple new Solana criteria."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="Policy with program and network restrictions",
        rules=[
            SendSolanaTransactionRule(
                action="reject",
                operation="sendSolTransaction",
                criteria=[
                    ProgramIdCriterion(
                        type="programId",
                        programIds=["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
                        operator="not in",
                    ),
                    SolNetworkCriterion(
                        type="solNetwork",
                        networks=["solana"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


# ---- SendEndUserEvmAsset / SendEndUserSolAsset rule tests ----


@pytest.mark.asyncio
async def test_create_policy_with_send_end_user_evm_asset_rule(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with a SendEndUserEvmAssetRule and ethValue criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser EVM Asset Policy with ethValue",
        rules=[
            SendEndUserEvmAssetRule(
                action="accept",
                operation="sendEndUserEvmAsset",
                criteria=[
                    EthValueCriterion(
                        type="ethValue",
                        ethValue="1000000000000000000",
                        operator="<=",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_send_end_user_evm_asset_rate_limiting(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with a SendEndUserEvmAssetRule and rateLimiting criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser EVM Asset Policy with rateLimiting",
        rules=[
            SendEndUserEvmAssetRule(
                action="accept",
                operation="sendEndUserEvmAsset",
                criteria=[
                    RateLimitingCriterion(
                        type="rateLimiting",
                        window="1h",
                        maxCount=10,
                        maxValueCents=50000,
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_send_end_user_sol_asset_rule(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with a SendEndUserSolAssetRule and solAddress criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser SOL Asset Policy with solAddress",
        rules=[
            SendEndUserSolAssetRule(
                action="accept",
                operation="sendEndUserSolAsset",
                criteria=[
                    SolAddressCriterion(
                        type="solAddress",
                        addresses=["So11111111111111111111111111111111111111112"],
                        operator="in",
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


@pytest.mark.asyncio
async def test_create_policy_with_send_end_user_sol_asset_rate_limiting(
    openapi_policy_model_factory, policy_model_factory
):
    """Test the creation of a policy with a SendEndUserSolAssetRule and rateLimiting criterion."""
    openapi_policy_model = openapi_policy_model_factory()
    mock_policies_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.policies = mock_policies_api
    mock_policies_api.create_policy = AsyncMock(return_value=openapi_policy_model)

    policy_model = policy_model_factory()
    client = PoliciesClient(api_clients=mock_api_clients)

    create_options = CreatePolicyOptions(
        scope="account",
        description="EndUser SOL Asset Policy with rateLimiting",
        rules=[
            SendEndUserSolAssetRule(
                action="accept",
                operation="sendEndUserSolAsset",
                criteria=[
                    RateLimitingCriterion(
                        type="rateLimiting",
                        window="24h",
                        maxCount=100,
                        maxValueCents=100000,
                    ),
                ],
            )
        ],
    )

    result = await client.create_policy(create_options)

    mock_policies_api.create_policy.assert_called_once_with(
        create_policy_request=CreatePolicyRequest(
            scope=create_options.scope,
            description=create_options.description,
            rules=map_request_rules_to_openapi_format(create_options.rules),
        ),
        x_idempotency_key=None,
    )
    assert result.id is not None
    assert result.scope == policy_model.scope
    assert result.description == policy_model.description
    assert result.rules == policy_model.rules
    assert result.created_at == policy_model.created_at
    assert result.updated_at == policy_model.updated_at


# ---- Transformer round-trip tests ----


def test_request_transformer_round_trip_evm_asset():
    """Verify request transformer correctly converts SendEndUserEvmAssetRule with rateLimiting."""
    rules = [
        SendEndUserEvmAssetRule(
            action="accept",
            operation="sendEndUserEvmAsset",
            criteria=[
                EthValueCriterion(
                    type="ethValue",
                    ethValue="500000000000000000",
                    operator="<=",
                ),
                RateLimitingCriterion(
                    type="rateLimiting",
                    window="1h",
                    maxCount=5,
                    maxValueCents=10000,
                ),
            ],
        )
    ]
    openapi_rules = map_request_rules_to_openapi_format(rules)
    assert len(openapi_rules) == 1
    rule = openapi_rules[0].actual_instance
    assert rule.operation == "sendEndUserEvmAsset"
    assert rule.action == "accept"
    assert len(rule.criteria) == 2


def test_request_transformer_round_trip_sol_asset():
    """Verify request transformer correctly converts SendEndUserSolAssetRule with rateLimiting."""
    rules = [
        SendEndUserSolAssetRule(
            action="reject",
            operation="sendEndUserSolAsset",
            criteria=[
                SolAddressCriterion(
                    type="solAddress",
                    addresses=["So11111111111111111111111111111111111111112"],
                    operator="not in",
                ),
                RateLimitingCriterion(
                    type="rateLimiting",
                    window="24h",
                    maxCount=50,
                    maxValueCents=500000,
                ),
            ],
        )
    ]
    openapi_rules = map_request_rules_to_openapi_format(rules)
    assert len(openapi_rules) == 1
    rule = openapi_rules[0].actual_instance
    assert rule.operation == "sendEndUserSolAsset"
    assert rule.action == "reject"
    assert len(rule.criteria) == 2


def test_response_transformer_round_trip_evm_asset():
    """Verify response transformer correctly converts OpenAPI SendEndUserEvmAsset rules."""
    from cdp.openapi_client.models.eth_value_criterion import (
        EthValueCriterion as OpenAPIEthValueCriterion,
    )
    from cdp.openapi_client.models.rate_limiting_criterion import (
        RateLimitingCriterion as OpenAPIRateLimitingCriterion,
    )
    from cdp.openapi_client.models.rule import Rule
    from cdp.openapi_client.models.send_end_user_evm_asset_criteria_inner import (
        SendEndUserEvmAssetCriteriaInner,
    )
    from cdp.openapi_client.models.send_end_user_evm_asset_rule import (
        SendEndUserEvmAssetRule as OpenAPISendEndUserEvmAssetRule,
    )

    openapi_rules = [
        Rule(
            actual_instance=OpenAPISendEndUserEvmAssetRule(
                action="accept",
                operation="sendEndUserEvmAsset",
                criteria=[
                    SendEndUserEvmAssetCriteriaInner(
                        actual_instance=OpenAPIEthValueCriterion(
                            type="ethValue",
                            eth_value="1000000000000000000",
                            operator="<=",
                        )
                    ),
                    SendEndUserEvmAssetCriteriaInner(
                        actual_instance=OpenAPIRateLimitingCriterion(
                            type="rateLimiting",
                            window="1h",
                            max_count=10,
                            max_value_cents=50000,
                        )
                    ),
                ],
            )
        )
    ]
    result = map_openapi_rules_to_response_format(openapi_rules)
    assert len(result) == 1
    rule = result[0]
    assert isinstance(rule, SendEndUserEvmAssetRule)
    assert rule.operation == "sendEndUserEvmAsset"
    assert len(rule.criteria) == 2
    assert isinstance(rule.criteria[0], EthValueCriterion)
    assert isinstance(rule.criteria[1], RateLimitingCriterion)
    assert rule.criteria[1].window == "1h"
    assert rule.criteria[1].maxCount == 10
    assert rule.criteria[1].maxValueCents == 50000


def test_response_transformer_round_trip_sol_asset():
    """Verify response transformer correctly converts OpenAPI SendEndUserSolAsset rules."""
    from cdp.openapi_client.models.rate_limiting_criterion import (
        RateLimitingCriterion as OpenAPIRateLimitingCriterion,
    )
    from cdp.openapi_client.models.rule import Rule
    from cdp.openapi_client.models.send_end_user_sol_asset_criteria_inner import (
        SendEndUserSolAssetCriteriaInner,
    )
    from cdp.openapi_client.models.send_end_user_sol_asset_rule import (
        SendEndUserSolAssetRule as OpenAPISendEndUserSolAssetRule,
    )
    from cdp.openapi_client.models.sol_address_criterion import (
        SolAddressCriterion as OpenAPISolAddressCriterion,
    )

    openapi_rules = [
        Rule(
            actual_instance=OpenAPISendEndUserSolAssetRule(
                action="accept",
                operation="sendEndUserSolAsset",
                criteria=[
                    SendEndUserSolAssetCriteriaInner(
                        actual_instance=OpenAPISolAddressCriterion(
                            type="solAddress",
                            addresses=["So11111111111111111111111111111111111111112"],
                            operator="in",
                        )
                    ),
                    SendEndUserSolAssetCriteriaInner(
                        actual_instance=OpenAPIRateLimitingCriterion(
                            type="rateLimiting",
                            window="24h",
                            max_count=100,
                            max_value_cents=100000,
                        )
                    ),
                ],
            )
        )
    ]
    result = map_openapi_rules_to_response_format(openapi_rules)
    assert len(result) == 1
    rule = result[0]
    assert isinstance(rule, SendEndUserSolAssetRule)
    assert rule.operation == "sendEndUserSolAsset"
    assert len(rule.criteria) == 2
    assert isinstance(rule.criteria[0], SolAddressCriterion)
    assert isinstance(rule.criteria[1], RateLimitingCriterion)
    assert rule.criteria[1].window == "24h"
    assert rule.criteria[1].maxCount == 100
    assert rule.criteria[1].maxValueCents == 100000
