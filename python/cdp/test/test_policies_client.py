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
from cdp.policies.types import (
    CreatePolicyOptions,
    EvmNetworkCriterion,
    MintAddressCriterion,
    NetUSDChangeCriterion,
    PrepareUserOperationRule,
    ProgramIdCriterion,
    SendEvmTransactionRule,
    SendSolanaTransactionRule,
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
            scope=policy_model.scope,
            description=policy_model.description,
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
