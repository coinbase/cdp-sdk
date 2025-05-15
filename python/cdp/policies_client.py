from cdp.api_clients import ApiClients
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest
from cdp.policies.types import (
    CreatePolicyOptions,
    ListPoliciesResult,
    Policy,
    PolicyScope,
    UpdatePolicyOptions,
)
from cdp.policies.utils import map_policy_rules_to_openapi_format


class PoliciesClient:
    """Client for managing policies."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def create_policy(
        self,
        policy: CreatePolicyOptions,
        idempotency_key: str | None = None,
    ) -> Policy:
        """Create a policy that can be used to govern the behavior of projects and accounts.

        Args:
            policy (CreatePolicyOptions): The policy to create.
            idempotency_key (str | None, optional): The idempotency key. Defaults to None.

        Returns:
            Policy: The created policy.

        """
        return await self.api_clients.policies.create_policy(
            create_policy_request=CreatePolicyRequest(
                scope=policy.scope,
                description=policy.description,
                rules=map_policy_rules_to_openapi_format(policy.rules),
            ),
            x_idempotency_key=idempotency_key,
        )

    async def update_policy(
        self,
        id: str,
        policy: UpdatePolicyOptions,
        idempotency_key: str | None = None,
    ) -> Policy:
        """Update an existing policy by its unique identifier.

        This will apply the updated policy to any project or accounts that are currently using it.

        Args:
            id (str): The unique identifier of the policy to update.
            policy (UpdatePolicyOptions): The updated policy configuration.
            idempotency_key (str | None, optional): The idempotency key. Defaults to None.

        Returns:
            Policy: The updated policy.

        """
        return await self.api_clients.policies.update_policy(
            policy_id=id,
            update_policy_request=UpdatePolicyRequest(
                description=policy.description,
                rules=map_policy_rules_to_openapi_format(policy.rules),
            ),
            x_idempotency_key=idempotency_key,
        )

    async def delete_policy(
        self,
        id: str,
        idempotency_key: str | None = None,
    ) -> None:
        """Delete a policy by its unique identifier.

        If a policy is referenced by an active project or account, this operation will fail.

        Args:
            id (str): The unique identifier of the policy to delete.
            idempotency_key (str | None, optional): The idempotency key. Defaults to None.

        """
        return await self.api_clients.policies.delete_policy(
            policy_id=id,
            x_idempotency_key=idempotency_key,
        )

    async def get_policy_by_id(self, id: str) -> Policy:
        """Retrieve a policy by its unique identifier.

        Args:
            id (str): The unique identifier of the policy to retrieve.

        Returns:
            Policy: The requested policy.

        """
        return await self.api_clients.policies.get_policy_by_id(
            policy_id=id,
        )

    async def list_policies(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
        scope: PolicyScope | None = None,
    ) -> ListPoliciesResult:
        """List policies belonging to the developer's CDP Project.

        Can be filtered by scope (project or account).

        Args:
            page_size (int | None, optional): The number of policies to return per page. Defaults to None.
            page_token (str | None, optional): The token for the next page of policies, if any. Defaults to None.
            scope (PolicyScope | None, optional): The scope of the policies to list. Defaults to None.

        Returns:
            ListPoliciesResult: A paginated list of policies.

        """
        return await self.api_clients.policies.list_policies(
            page_size=page_size,
            page_token=page_token,
            scope=scope,
        )
