"""Utilities for spend permissions."""

from typing import Literal

from cdp.errors import UserInputValidationError
from cdp.spend_permissions.types import (
    SpendPermission,
    SpendPermissionInput,
    SpendPermissionNetworks,
)


def resolve_token_address(
    token: Literal["eth", "usdc"] | str, network: SpendPermissionNetworks
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


def resolve_spend_permission(
    spend_permission_input: SpendPermissionInput,
    network: SpendPermissionNetworks,
) -> SpendPermission:
    """Resolve a spend permission input to a spend permission.

    Args:
        spend_permission_input: The spend permission input to resolve.
        network: The network to resolve the spend permission for.

    Returns:
        The resolved spend permission.

    """
    return SpendPermission(
        account=spend_permission_input.account,
        spender=spend_permission_input.spender,
        token=resolve_token_address(spend_permission_input.token, network),
        allowance=spend_permission_input.allowance,
        period=spend_permission_input.period,
        start=spend_permission_input.start,
        end=spend_permission_input.end,
        salt=spend_permission_input.salt or 0,
        extra_data=spend_permission_input.extra_data or "0x",
    )
