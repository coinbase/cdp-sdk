"""Spend Permissions actions module."""

from cdp.actions.evm.spend_permissions.account_use import account_use_spend_permission
from cdp.actions.evm.spend_permissions.smart_account_use import smart_account_use_spend_permission

__all__ = [
    "account_use_spend_permission",
    "smart_account_use_spend_permission",
]
