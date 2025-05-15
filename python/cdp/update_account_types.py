from pydantic import BaseModel


class UpdateAccountOptions(BaseModel):
    """Options for updating an account."""

    """An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names must be unique across all EVM accounts in the developer's CDP Project."""
    name: str | None = None

    """An optional account policy for the account. The account policy will be applied to the account when it is created."""
    account_policy: str | None = None
