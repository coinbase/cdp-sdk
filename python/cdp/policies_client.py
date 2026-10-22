import re
from datetime import datetime, timezone

from pydantic import BaseModel

from cdp.analytics import track_action, track_error
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest
from cdp.openapi_client.models.pause_policy_request import PausePolicyRequest
from cdp.openapi_client.models.policy_simulation_result import PolicySimulationResult
from cdp.openapi_client.models.simulate_policies_request import SimulatePoliciesRequest
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest
from cdp.policies.request_transformer import map_request_rules_to_openapi_format
from cdp.policies.response_transformer import map_openapi_policy
from cdp.policies.types import (
    CreatePolicyOptions,
    ListPoliciesResult,
    Policy,
    PolicyScope,
    UpdatePolicyOptions,
)


def _parse_resume_at(resume_at: datetime | str) -> datetime:
    """Parse a future, timezone-aware automatic resume timestamp."""
    if isinstance(resume_at, str):
        try:
            resume_at = datetime.fromisoformat(re.sub(r"[zZ]$", "+00:00", resume_at))
        except ValueError as error:
            raise ValueError(
                f"resume_at {resume_at!r} is not a valid ISO 8601 timestamp. "
                "Pass a value such as 2026-01-01T00:00:00Z or a timezone-aware datetime."
            ) from error
    if resume_at.tzinfo is None:
        raise ValueError(
            "resume_at must include a timezone. Pass a timezone-aware datetime such as "
            "datetime.now(timezone.utc) + timedelta(days=1), or an ISO 8601 string with an offset."
        )
    if resume_at <= datetime.now(timezone.utc):
        raise ValueError(
            "resume_at must be in the future. Pass a time within the next 30 days, "
            "or omit it to pause until resumed."
        )
    return resume_at


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
        track_action(
            action="create_policy",
            properties={
                "scope": policy.scope,
            },
        )

        try:
            openapi_policy = await self.api_clients.policies.create_policy(
                create_policy_request=CreatePolicyRequest(
                    scope=policy.scope,
                    description=policy.description,
                    rules=map_request_rules_to_openapi_format(policy.rules),
                ),
                x_idempotency_key=idempotency_key,
            )
            return map_openapi_policy(openapi_policy)
        except Exception as error:
            track_error(error, "create_policy")
            raise

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
        track_action(action="update_policy")

        try:
            openapi_policy = await self.api_clients.policies.update_policy(
                policy_id=id,
                update_policy_request=UpdatePolicyRequest(
                    description=policy.description,
                    rules=map_request_rules_to_openapi_format(policy.rules),
                ),
                x_idempotency_key=idempotency_key,
            )
            return map_openapi_policy(openapi_policy)
        except Exception as error:
            track_error(error, "update_policy")
            raise

    async def pause_policy(
        self,
        id: str,
        resume_at: datetime | str | None = None,
        idempotency_key: str | None = None,
    ) -> Policy:
        """Pause a policy indefinitely or until a future time within the next 30 days.

        Re-pausing keeps the original paused_at and replaces or clears resume_at.

        Args:
            id (str): The unique identifier of the policy to pause.
            resume_at (datetime | str | None, optional): A timezone-aware datetime or ISO 8601
                string with an offset for automatic resumption. Omit to pause indefinitely.
            idempotency_key (str | None, optional): The idempotency key. Defaults to None.

        Returns:
            Policy: The paused policy.

        Raises:
            ValueError: If resume_at is invalid, lacks a timezone, or is not in the future.

        """
        track_action(action="pause_policy")

        try:
            pause_policy_request = (
                PausePolicyRequest(resume_at=_parse_resume_at(resume_at))
                if resume_at is not None
                else None
            )
            openapi_policy = await self.api_clients.policies.pause_policy(
                policy_id=id,
                pause_policy_request=pause_policy_request,
                x_idempotency_key=idempotency_key,
            )
            return map_openapi_policy(openapi_policy)
        except Exception as error:
            track_error(error, "pause_policy")
            raise

    async def resume_policy(
        self,
        id: str,
        idempotency_key: str | None = None,
    ) -> Policy:
        """Resume evaluation of a paused policy.

        Resuming an active policy returns it unchanged.

        Args:
            id (str): The unique identifier of the policy to resume.
            idempotency_key (str | None, optional): The idempotency key. Defaults to None.

        Returns:
            Policy: The active policy.

        """
        track_action(action="resume_policy")

        try:
            openapi_policy = await self.api_clients.policies.resume_policy(
                policy_id=id,
                x_idempotency_key=idempotency_key,
            )
            return map_openapi_policy(openapi_policy)
        except Exception as error:
            track_error(error, "resume_policy")
            raise

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
        track_action(action="delete_policy")

        try:
            return await self.api_clients.policies.delete_policy(
                policy_id=id,
                x_idempotency_key=idempotency_key,
            )
        except Exception as error:
            track_error(error, "delete_policy")
            raise

    async def get_policy_by_id(self, id: str) -> Policy:
        """Retrieve a policy by its unique identifier.

        Args:
            id (str): The unique identifier of the policy to retrieve.

        Returns:
            Policy: The requested policy.

        """
        track_action(action="get_policy_by_id")

        try:
            openapi_policy = await self.api_clients.policies.get_policy_by_id(
                policy_id=id,
            )
            return map_openapi_policy(openapi_policy)
        except Exception as error:
            track_error(error, "get_policy_by_id")
            raise

    async def simulate(
        self, request: SimulatePoliciesRequest | BaseModel
    ) -> PolicySimulationResult:
        """Evaluate policies without signing or submitting the operation.

        Args:
            request (SimulatePoliciesRequest | BaseModel): A simulation request or one of
                its generated concrete SimulationInput models.

        Returns:
            PolicySimulationResult: The policy decision, including normal reject results.

        """
        track_action(action="simulate_policies")

        try:
            if not isinstance(request, SimulatePoliciesRequest):
                request = SimulatePoliciesRequest(actual_instance=request)
            return await self.api_clients.policies.simulate_policies(
                simulate_policies_request=request,
            )
        except Exception as error:
            track_error(error, "simulate_policies")
            raise

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
        track_action(
            action="list_policies",
            properties={
                "scope": scope,
            },
        )

        try:
            openapi_policies = await self.api_clients.policies.list_policies(
                page_size=page_size,
                page_token=page_token,
                scope=scope,
            )
            return ListPoliciesResult(
                policies=[
                    map_openapi_policy(openapi_policy)
                    for openapi_policy in openapi_policies.policies
                ],
                next_page_token=openapi_policies.next_page_token,
            )
        except Exception as error:
            track_error(error, "list_policies")
            raise
