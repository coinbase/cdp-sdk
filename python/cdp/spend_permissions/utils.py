"""Utilities for spend permissions."""

import secrets
from datetime import datetime
from typing import Literal

from cdp.errors import UserInputValidationError
from cdp.openapi_client import SpendPermissionNetwork
from cdp.spend_permissions.types import (
    SpendPermission,
    SpendPermissionInput,
)


def resolve_token_address(
    token: Literal["eth", "usdc"] | str, network: SpendPermissionNetwork
) -> str:
    """Resolve the address of a token for a given network.

    Args:
        token: The token symbol or contract address.
        network: The network to get the address for.

    Returns:
        The address of the token.

    Raises:
        UserInputValidationError: If automatic address lookup is not supported.

    """
    if token == "eth":
        return "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

    if token == "usdc" and network == "base":
        return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

    if token == "usdc" and network == "base-sepolia":
        return "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

    if token == "usdc":
        raise UserInputValidationError(
            f"Automatic token address lookup for {token} is not supported on {network}. "
            "Please provide the token address manually."
        )

    return token


def generate_random_salt() -> int:
    """Generate a random salt using cryptographically secure random number generation.

    Returns:
        A random integer salt.

    """
    return secrets.randbelow(2**256)


def resolve_spend_permission(
    spend_permission_input: SpendPermissionInput,
    network: SpendPermissionNetwork,
) -> SpendPermission:
    """Resolve a spend permission input to a spend permission.

    Args:
        spend_permission_input: The spend permission input to resolve.
        network: The network to resolve the spend permission for.

    Returns:
        The resolved spend permission.

    Raises:
        UserInputValidationError: If validation fails for the input parameters.

    """
    # Validate that either period or period_in_days is provided, but not both
    if (
        spend_permission_input.period is not None
        and spend_permission_input.period_in_days is not None
    ):
        raise UserInputValidationError(
            "Cannot specify both 'period' and 'period_in_days'. Please provide only one."
        )

    if spend_permission_input.period is None and spend_permission_input.period_in_days is None:
        raise UserInputValidationError(
            "Must specify either 'period' (in seconds) or 'period_in_days'."
        )

    # Convert period_in_days to period in seconds if provided
    period = spend_permission_input.period
    if period is None and spend_permission_input.period_in_days is not None:
        period = spend_permission_input.period_in_days * 24 * 60 * 60

    # Set defaults for start and end
    now = datetime.now()
    start_datetime = spend_permission_input.start or now
    end_datetime = spend_permission_input.end

    # Convert datetime objects to seconds since epoch for the contract
    start = int(start_datetime.timestamp())
    # For end, use max uint48 value if no end datetime is provided
    end = int(end_datetime.timestamp()) if end_datetime else 281474976710655

    return SpendPermission(
        account=spend_permission_input.account,
        spender=spend_permission_input.spender,
        token=resolve_token_address(spend_permission_input.token, network),
        allowance=spend_permission_input.allowance,
        period=period,
        start=start,
        end=end,
        salt=spend_permission_input.salt or generate_random_salt(),
        extra_data=spend_permission_input.extra_data or "0x",
    )
